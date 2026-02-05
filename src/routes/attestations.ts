import { Router } from 'express';
import type { Response } from 'express';
import { attestationService } from '../services/attestation-service';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';
import { validate, CreateAttestationSchema, PaginationSchema } from '../utils/validation';
import { ApiResponse } from '../models';
import { Attestation, AttestationRequest, AttestationType } from '../models/attestation';

const router = Router();

// List attestations
router.get(
  '/',
  validate(PaginationSchema, 'query'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { page, limit } = req.query;
    const { issuer, subject, type, validOnly, issuedAfter, issuedBefore } = req.query;

    const { attestations, total } = await attestationService.listAttestations(
      {
        issuer: issuer as string,
        subject: subject as string,
        type: type as AttestationType,
        validOnly: validOnly === 'true',
        issuedAfter: issuedAfter ? new Date(issuedAfter as string) : undefined,
        issuedBefore: issuedBefore ? new Date(issuedBefore as string) : undefined
      },
      {
        page: parseInt(page as string, 10) || 1,
        limit: parseInt(limit as string, 10) || 20
      }
    );

    const response: ApiResponse<Attestation[]> = {
      success: true,
      data: attestations,
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

// Create attestation
router.post(
  '/',
  authenticateToken,
  validate(CreateAttestationSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const request: AttestationRequest = req.body;
    const issuerDid = req.agent!.did;

    const attestation = await attestationService.createAttestation(issuerDid, request);

    const response: ApiResponse<Attestation> = {
      success: true,
      data: attestation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.status(201).json(response);
  }
);

// Get attestation by ID
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const attestation = await attestationService.getAttestation(req.params.id);

    const response: ApiResponse<Attestation> = {
      success: true,
      data: attestation,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Verify attestation
router.post(
  '/:id/verify',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const result = await attestationService.verifyAttestation(req.params.id);

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

// Revoke attestation
router.post(
  '/:id/revoke',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { reason } = req.body;
    const revokedBy = req.agent!.did;

    await attestationService.revokeAttestation(req.params.id, revokedBy, reason);

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

// Get attestation chain
router.get(
  '/:subject/chain',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { type } = req.query;

    const chain = await attestationService.buildAttestationChain(
      req.params.subject,
      type as AttestationType
    );

    const response: ApiResponse<typeof chain> = {
      success: true,
      data: chain,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

// Get attestation stats for a DID
router.get(
  '/stats/:did',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const stats = await attestationService.getAttestationStats(req.params.did);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string
      }
    };

    res.json(response);
  }
);

export default router;
