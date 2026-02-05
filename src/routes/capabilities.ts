import { Router } from 'express';
import type { Response } from 'express';
import { capabilityIssuer } from '../services/capability-issuer';
import { AuthenticatedRequest, authenticateToken, requireCapability } from '../middleware/auth';
import { validate, CreateCapabilitySchema, VerifyCapabilitySchema } from '../utils/validation';
import { ApiResponse } from '../models';
import { Capability, CapabilityRequest, CapabilityToken } from '../models/capability';

const router = Router();

// List capabilities
router.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { subject, issuer, status } = req.query;

    const capabilities = await capabilityIssuer.listCapabilities({
      subject: subject as string,
      issuer: issuer as string,
      status: status as any
    });

    const response: ApiResponse<Capability[]> = {
      success: true,
      data: capabilities,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Issue capability
router.post(
  '/',
  authenticateToken,
  requireCapability('admin', 'delegate'),
  validate(CreateCapabilitySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const request: CapabilityRequest = req.body;
    const issuerDid = req.agent!.did;

    const token = await capabilityIssuer.issueCapability(issuerDid, request);

    const response: ApiResponse<CapabilityToken> = {
      success: true,
      data: token,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.status(201).json(response);
  }
);

// Verify capability
router.post(
  '/verify',
  validate(VerifyCapabilitySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await capabilityIssuer.verifyCapability(req.body);

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

// Get capability by ID
router.get(
  '/:id',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const capabilities = await capabilityIssuer.listCapabilities();
    const capability = capabilities.find((c) => c.id === req.params.id);

    if (!capability) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Capability not found' }
      });
      return;
    }

    const response: ApiResponse<Capability> = {
      success: true,
      data: capability,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Revoke capability
router.post(
  '/:id/revoke',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { reason } = req.body;
    const revokedBy = req.agent!.did;

    await capabilityIssuer.revokeCapability(req.params.id, revokedBy, reason);

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

// Delegate capability
router.post(
  '/:id/delegate',
  authenticateToken,
  requireCapability('delegate'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { delegatee, restrictions, expiresInHours } = req.body;
    const delegator = req.agent!.did;

    const delegation = await capabilityIssuer.delegateCapability(
      req.params.id,
      delegator,
      delegatee,
      restrictions,
      expiresInHours
    );

    const response: ApiResponse<typeof delegation> = {
      success: true,
      data: delegation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.status(201).json(response);
  }
);

export default router;
