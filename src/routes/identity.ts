import { Router } from 'express';
import type { Response } from 'express';
import { didService } from '../services/did-service';
import { identityManager } from '../services/identity-manager';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../models';
import { DIDDocument } from '../models/identity';

const router = Router();

// Resolve a DID
router.get(
  '/resolve/:did(*)',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const did = req.params.did;
    const result = await didService.resolveDID(did);

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

// Get identity by agent ID
router.get(
  '/agent/:agentId',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const agent = await identityManager.getAgent(req.params.agentId);
    const identityResult = await didService.resolveDID(agent.did);

    const response: ApiResponse<{
      agent: typeof agent;
      identity: typeof identityResult;
    }> = {
      success: true,
      data: {
        agent,
        identity: identityResult
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// List all DIDs (local only)
router.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const dids = didService.getAllLocalDIDs();

    const response: ApiResponse<typeof dids> = {
      success: true,
      data: dids,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Add verification method to DID
router.post(
  '/:did/verification-methods',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { type, publicKeyHex, publicKeyBase58 } = req.body;

    const document = await didService.addVerificationMethod(req.params.did, {
      id: `${req.params.did}#keys-${Date.now()}`,
      type,
      publicKeyHex,
      publicKeyBase58
    });

    const response: ApiResponse<DIDDocument> = {
      success: true,
      data: document,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Add service endpoint to DID
router.post(
  '/:did/services',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id, type, serviceEndpoint } = req.body;

    const document = await didService.addServiceEndpoint(req.params.did, {
      id,
      type,
      serviceEndpoint
    });

    const response: ApiResponse<DIDDocument> = {
      success: true,
      data: document,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Deactivate DID
router.delete(
  '/:did',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await didService.deactivateDID(req.params.did);

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

// Verify DID ownership
router.post(
  '/:did/verify',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { signature, message } = req.body;

    const valid = didService.verifyDIDOwnership(
      req.params.did,
      signature,
      message
    );

    const response: ApiResponse<{ valid: boolean }> = {
      success: true,
      data: { valid },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

export default router;
