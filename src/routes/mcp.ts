import { Router } from 'express';
import type { Response } from 'express';
import { mcpIntegration } from '../services/mcp-integration';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../models';

const router = Router();

// Get MCP tools
router.get(
  '/tools',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    const tools = mcpIntegration.getTools();

    const response: ApiResponse<typeof tools> = {
      success: true,
      data: tools,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Get MCP resources
router.get(
  '/resources',
  authenticateToken,
  (req: AuthenticatedRequest, res: Response): void => {
    const resources = mcpIntegration.getResources();

    const response: ApiResponse<typeof resources> = {
      success: true,
      data: resources,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Execute MCP tool
router.post(
  '/tools/:name',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { name } = req.params;
    const args = req.body;

    const result = await mcpIntegration.executeTool(name, args);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Get MCP resource
router.get(
  '/resources/*',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const uri = req.params[0];
    const fullUri = `agent-identity-hub://${uri}`;

    const result = await mcpIntegration.getResource(fullUri);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

export default router;
