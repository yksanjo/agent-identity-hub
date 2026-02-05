import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { identityManager } from '../services/identity-manager';
import { capabilityIssuer } from '../services/capability-issuer';
import { AuthenticationError, AuthorizationError } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface AuthenticatedRequest extends Request {
  agent?: {
    id: string;
    did: string;
    capabilities: string[];
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Try JWT authentication first
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        sub: string;
        agentId?: string;
      };

      const agent = await identityManager.getAgentByDID(decoded.sub);
      
      req.agent = {
        id: agent.id,
        did: agent.did,
        capabilities: agent.capabilities
      };

      return next();
    } catch {
      // Not a valid JWT, try API key
    }

    // Try capability token
    const capabilityResult = await capabilityIssuer.verifyCapability({
      token,
      action: 'authenticate',
      resource: 'system'
    });

    if (capabilityResult.valid && capabilityResult.subject) {
      const agent = await identityManager.getAgentByDID(capabilityResult.subject);

      req.agent = {
        id: agent.id,
        did: agent.did,
        capabilities: capabilityResult.allowedActions || []
      };

      return next();
    }

    throw new AuthenticationError('Invalid token');
  } catch (error) {
    next(error);
  }
}

export function requireCapability(...requiredCapabilities: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.agent) {
      next(new AuthenticationError('Not authenticated'));
      return;
    }

    const hasCapability = requiredCapabilities.some((cap) =>
      req.agent!.capabilities.includes(cap) || req.agent!.capabilities.includes('admin')
    );

    if (!hasCapability) {
      next(
        new AuthorizationError(
          `Missing required capability: ${requiredCapabilities.join(' or ')}`
        )
      );
      return;
    }

    next();
  };
}

export function requireOwnership(paramName: string = 'id') {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.agent) {
      next(new AuthenticationError('Not authenticated'));
      return;
    }

    const resourceId = req.params[paramName];
    
    try {
      const resource = await identityManager.getAgent(resourceId);
      
      if (resource.did !== req.agent.did && !req.agent.capabilities.includes('admin')) {
        next(new AuthorizationError('Not authorized to access this resource'));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
