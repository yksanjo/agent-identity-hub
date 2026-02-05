import winston from 'winston';

const { combine, timestamp, json, errors, printf, colorize } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  if (stack) {
    msg += `\n${stack}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: {
    service: 'agent-identity-hub'
  },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        colorize(),
        process.env.NODE_ENV === 'production' ? json() : devFormat
      )
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(timestamp(), json())
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: combine(timestamp(), json())
    })
  );
}

export function createLogger(context: string) {
  return logger.child({ context });
}

export default logger;
