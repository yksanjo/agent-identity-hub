import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import routes from './routes';
import { errorHandler, notFoundHandler, requestLogger } from './middleware';
import { initDatabase, closeDatabase } from './utils/db';
import logger from './utils/logger';
import { identityManager } from './services/identity-manager';
import { trustEngine } from './services/trust-engine';
import { WebSocketMessageType, WebSocketMessage } from './models';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.DASHBOARD_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"]
    }
  }
}));

app.use(cors({
  origin: process.env.DASHBOARD_URL || 'http://localhost:3001',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));
app.use(requestLogger);

// API routes
app.use('/api/v1', routes);

// Static files for dashboard (in production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dashboard/build'));
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected to WebSocket', { socketId: socket.id });

  socket.on('subscribe', (channel: string) => {
    socket.join(channel);
    logger.info('Client subscribed to channel', { socketId: socket.id, channel });
  });

  socket.on('unsubscribe', (channel: string) => {
    socket.leave(channel);
    logger.info('Client unsubscribed from channel', { socketId: socket.id, channel });
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected from WebSocket', { socketId: socket.id });
  });
});

// Broadcast function for real-time updates
export function broadcastMessage(message: WebSocketMessage): void {
  io.emit('message', message);
}

export function broadcastToChannel(channel: string, message: WebSocketMessage): void {
  io.to(channel).emit('message', message);
}

// Background jobs
async function runBackgroundJobs(): Promise<void> {
  try {
    // Recalculate trust scores periodically
    const { agents } = await identityManager.listAgents(
      { status: 'active' },
      { page: 1, limit: 100 }
    );

    for (const agent of agents) {
      try {
        const calculation = await trustEngine.calculateTrustScore(agent.id);
        
        // Broadcast trust update
        broadcastMessage({
          type: WebSocketMessageType.TRUST_UPDATE,
          payload: {
            agentId: agent.id,
            trustScore: calculation.finalScore,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });

        // Detect anomalies
        const anomalies = await trustEngine.detectAnomalies(agent.id);
        if (anomalies.length > 0) {
          broadcastMessage({
            type: WebSocketMessageType.ANOMALY_ALERT,
            payload: {
              agentId: agent.id,
              anomalies: anomalies.map((a) => ({
                type: a.anomalyType,
                severity: a.severity,
                confidence: a.confidence
              }))
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        logger.error('Error processing agent in background job', {
          agentId: agent.id,
          error
        });
      }
    }
  } catch (error) {
    logger.error('Background job error', { error });
  }
}

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`Agent Identity Hub server running on port ${PORT}`);
      logger.info(`API available at http://localhost:${PORT}/api/v1`);
      logger.info(`WebSocket server ready`);
    });

    // Start background jobs
    setInterval(runBackgroundJobs, 5 * 60 * 1000); // Run every 5 minutes
    
    // Run once on startup
    setTimeout(runBackgroundJobs, 5000);

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  logger.info('Shutting down server...');
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connection
  await closeDatabase();

  // Close WebSocket connections
  io.close(() => {
    logger.info('WebSocket server closed');
  });

  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

startServer();
