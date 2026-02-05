import { Router } from 'express';
import agentsRouter from './agents';
import identityRouter from './identity';
import capabilitiesRouter from './capabilities';
import attestationsRouter from './attestations';
import mcpRouter from './mcp';

const router = Router();

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

router.use(`/agents`, agentsRouter);
router.use(`/identity`, identityRouter);
router.use(`/capabilities`, capabilitiesRouter);
router.use(`/attestations`, attestationsRouter);
router.use(`/mcp`, mcpRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      version: API_VERSION,
      timestamp: new Date().toISOString()
    }
  });
});

// Dashboard data endpoint
router.get('/dashboard/stats', async (req, res) => {
  // Aggregate stats for the dashboard
  const stats = {
    totalAgents: 0,
    activeAgents: 0,
    totalCapabilities: 0,
    totalAttestations: 0,
    recentAnomalies: 0,
    averageTrustScore: 0
  };

  res.json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
