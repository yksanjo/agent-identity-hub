import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'orchestrator',
    'worker',
    'validator',
    'gateway',
    'specialist',
    'user_proxy'
  ]),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'revoked', 'pending']).optional(),
  capabilities: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const CreateCapabilitySchema = z.object({
  subject: z.string().regex(/^did:/, 'Must be a valid DID'),
  actions: z.array(z.string()).min(1),
  resources: z.array(z.string()).min(1),
  conditions: z.array(
    z.object({
      type: z.enum(['time', 'rate_limit', 'resource_scope', 'context']),
      parameter: z.string(),
      operator: z.enum([
        'equals',
        'not_equals',
        'greater_than',
        'less_than',
        'contains',
        'in',
        'before',
        'after'
      ]),
      value: z.unknown()
    })
  ).optional(),
  expiresInHours: z.number().int().positive().max(8760).optional()
});

export const CreateAttestationSchema = z.object({
  type: z.enum([
    'identity_verification',
    'capability_authorization',
    'behavior_assertion',
    'trust_assertion',
    'completion_certificate',
    'membership',
    'custom'
  ]),
  subject: z.string().regex(/^did:/, 'Must be a valid DID'),
  claims: z.array(
    z.object({
      type: z.string(),
      value: z.unknown()
    })
  ).min(1),
  expiresInHours: z.number().int().positive().max(8760).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const VerifyCapabilitySchema = z.object({
  token: z.string(),
  action: z.string(),
  resource: z.string(),
  context: z.record(z.unknown()).optional()
});

export const PaginationSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export function validate<T extends z.ZodType>(
  schema: T,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(data);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: result.error.flatten()
        }
      });
      return;
    }

    if (source === 'body') {
      req.body = result.data;
    }
    next();
  };
}

export function validateDID(did: string): boolean {
  return /^did:[a-z]+:[a-zA-Z0-9._%-:]+$/.test(did);
}

export function validateEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 1000);
}

export function validateApiKey(key: string): boolean {
  return /^aik_[a-zA-Z0-9_-]{43}$/.test(key);
}
