import { Router } from 'express';
import type { Response } from 'express';
import { identityManager } from '../services/identity-manager';
import { trustEngine } from '../services/trust-engine';
import { mcpIntegration } from '../services/mcp-integration';
import { AuthenticatedRequest, authenticateToken, requireCapability } from '../middleware/auth';
import { validate, CreateAgentSchema, UpdateAgentSchema, PaginationSchema } from '../utils/validation';
import { ApiResponse } from '../models';
import { Agent, CreateAgentRequest, UpdateAgentRequest } from '../models/agent';

const router = Router();

// List agents
router.get(
  '/',
  validate(PaginationSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { page, limit, sortBy, sortOrder } = req.query;
    const { status, type, search } = req.query;

    const { agents, total } = await identityManager.listAgents(
      {
        status: status as any,
        type: type as any,
        search: search as string
      },
      {
        page: parseInt(page as string, 10) || 1,
        limit: parseInt(limit as string, 10) || 20
      }
    );

    const response: ApiResponse<Agent[]> = {
      success: true,
      data: agents,
      meta: {
        page: parseInt(page as string, 10) || 1,
        limit: parseInt(limit as string, 10) || 20,
        total,
        hasMore: total > (parseInt(page as string, 10) || 1) * (parseInt(limit as string, 10) || 20),
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Get agent by ID or DID
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const agent = await identityManager.getAgent(req.params.id);

    // Get additional data
    const relationships = await identityManager.getRelationships(agent.id);
    const activity = await identityManager.getAgentActivity(agent.id, 20);
    const trustHistory = await trustEngine.getTrustHistory(agent.id, 30);

    const response: ApiResponse<{
      agent: Agent;
      relationships: typeof relationships;
      activity: typeof activity;
      trustHistory: typeof trustHistory;
    }> = {
      success: true,
      data: {
        agent,
        relationships,
        activity,
        trustHistory
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Create new agent
router.post(
  '/',
  authenticateToken,
  requireCapability('admin', 'create'),
  validate(CreateAgentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const request: CreateAgentRequest = req.body;
    const { agent, identity, apiKey } = await identityManager.createAgent(
      request,
      req.agent?.did
    );

    const response: ApiResponse<{
      agent: Agent;
      identity: { did: string };
      apiKey: string;
    }> = {
      success: true,
      data: {
        agent,
        identity: { did: identity.did },
        apiKey
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.status(201).json(response);
  }
);

// Update agent
router.patch(
  '/:id',
  authenticateToken,
  validate(UpdateAgentSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const request: UpdateAgentRequest = req.body;
    const agent = await identityManager.updateAgent(req.params.id, request);

    const response: ApiResponse<Agent> = {
      success: true,
      data: agent,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Delete agent
router.delete(
  '/:id',
  authenticateToken,
  requireCapability('admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await identityManager.deleteAgent(req.params.id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Create relationship between agents
router.post(
  '/:id/relationships',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { targetAgentId, relationshipType, permissions } = req.body;

    const relationship = await identityManager.createRelationship(
      req.params.id,
      targetAgentId,
      relationshipType,
      permissions
    );

    const response: ApiResponse<typeof relationship> = {
      success: true,
      data: relationship,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.status(201).json(response);
  }
);

// Get agent activity
router.get(
  '/:id/activity',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const activity = await identityManager.getAgentActivity(req.params.id, limit);

    const response: ApiResponse<typeof activity> = {
      success: true,
      data: activity,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Calculate trust score
router.post(
  '/:id/trust-score',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const calculation = await trustEngine.calculateTrustScore(req.params.id);

    const response: ApiResponse<typeof calculation> = {
      success: true,
      data: calculation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Detect anomalies
router.post(
  '/:id/anomalies',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const anomalies = await trustEngine.detectAnomalies(req.params.id);

    const response: ApiResponse<typeof anomalies> = {
      success: true,
      data: anomalies,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Get agent graph data (for social graph visualization)
router.get(
  '/graph/social',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { agents } = await identityManager.listAgents(
      {},
      { page: 1, limit: 100 }
    );

    const nodes = agents.map((agent) => ({
      id: agent.id,
      did: agent.did,
      name: agent.name,
      type: agent.type,
      trustScore: agent.trustScore,
      status: agent.status
    }));

    const links: Array<{ source: string; target: string; type: string; value: number }> = [];

    for (const agent of agents) {
      const relationships = await identityManager.getRelationships(agent.id);
      
      for (const rel of relationships.outgoing) {
        links.push({
          source: agent.id,
          target: rel.targetAgentId,
          type: rel.relationshipType,
          value: rel.trustLevel
        });
      }
    }

    const response: ApiResponse<{ nodes: typeof nodes; links: typeof links }> = {
      success: true,
      data: { nodes, links },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

export default router;
