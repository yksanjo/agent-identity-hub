import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';
import { query } from '../utils/db';
import { identityManager } from './identity-manager';
import {
  Capability,
  CapabilityStatus,
  CapabilityRequest,
  CapabilityToken,
  CapabilityVerificationRequest,
  CapabilityVerificationResult,
  CapabilityProof,
  CapabilityDelegation,
  DEFAULT_CAPABILITIES,
  DEFAULT_RESOURCES
} from '../models/capability';
import { ActivityType } from '../models/agent';
import { generateId, hashData, generateUUID } from '../utils/crypto';
import { AuthorizationError, ValidationError, NotFoundError } from '../utils/errors';

const logger = createLogger('capability-issuer');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export class CapabilityIssuer {
  private activeCapabilities: Map<string, Capability> = new Map();

  async issueCapability(
    issuerDid: string,
    request: CapabilityRequest
  ): Promise<CapabilityToken> {
    // Verify issuer exists and is active
    const issuer = await identityManager.getAgentByDID(issuerDid);
    if (issuer.status !== 'active') {
      throw new AuthorizationError('Issuer is not active');
    }

    // Verify subject exists
    const subject = await identityManager.getAgentByDID(request.subject);
    if (subject.status !== 'active') {
      throw new AuthorizationError('Subject is not active');
    }

    // Validate actions and resources
    this.validateActionsAndResources(request.actions, request.resources);

    const capabilityId = `urn:cap:${generateUUID()}`;
    const now = new Date();
    const expiresInHours = request.expiresInHours || 24;
    const expiration = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);

    // Create capability object
    const capability: Capability = {
      id: capabilityId,
      subject: request.subject,
      issuer: issuerDid,
      actions: request.actions,
      resources: request.resources,
      conditions: request.conditions,
      notBefore: now,
      expiration,
      issuedAt: now,
      status: CapabilityStatus.ACTIVE
    };

    // Create JWT token
    const token = jwt.sign(
      {
        jti: capabilityId,
        sub: request.subject,
        iss: issuerDid,
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(expiration.getTime() / 1000),
        nbf: Math.floor(now.getTime() / 1000),
        capability: {
          actions: request.actions,
          resources: request.resources,
          conditions: request.conditions
        }
      },
      JWT_SECRET,
      { algorithm: 'HS256' }
    );

    // Store capability
    await query(
      `INSERT INTO capabilities 
       (id, subject, issuer, actions, resources, conditions, not_before, 
        expiration, issued_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        capability.id,
        capability.subject,
        capability.issuer,
        JSON.stringify(capability.actions),
        JSON.stringify(capability.resources),
        JSON.stringify(capability.conditions || []),
        capability.notBefore,
        capability.expiration,
        capability.issuedAt,
        capability.status
      ]
    );

    this.activeCapabilities.set(capabilityId, capability);

    // Log activity
    await identityManager.logActivity({
      id: generateId(),
      agentId: subject.id,
      activityType: ActivityType.CAPABILITY_GRANTED,
      description: `Capability granted by ${issuer.name}`,
      timestamp: now,
      metadata: {
        capabilityId,
        issuer: issuerDid,
        actions: request.actions,
        resources: request.resources
      }
    });

    logger.info('Capability issued', {
      capabilityId,
      issuer: issuerDid,
      subject: request.subject
    });

    return {
      token,
      capability,
      expiresIn: expiresInHours * 3600
    };
  }

  async verifyCapability(
    request: CapabilityVerificationRequest
  ): Promise<CapabilityVerificationResult> {
    try {
      // Verify JWT
      const decoded = jwt.verify(request.token, JWT_SECRET) as {
        jti: string;
        sub: string;
        iss: string;
        exp: number;
        capability: {
          actions: string[];
          resources: string[];
          conditions?: unknown[];
        };
      };

      // Check if capability is revoked
      const result = await query<Capability>(
        'SELECT * FROM capabilities WHERE id = $1',
        [decoded.jti]
      );

      if (result.rows.length === 0) {
        return { valid: false, errors: ['Capability not found'] };
      }

      const capability = this.mapCapabilityFromDb(result.rows[0]);

      if (capability.status === CapabilityStatus.REVOKED) {
        return { valid: false, errors: ['Capability has been revoked'] };
      }

      if (capability.status === CapabilityStatus.EXPIRED) {
        return { valid: false, errors: ['Capability has expired'] };
      }

      // Verify subject matches
      if (decoded.sub !== capability.subject) {
        return { valid: false, errors: ['Subject mismatch'] };
      }

      // Check action permission
      if (!capability.actions.includes(request.action)) {
        return {
          valid: false,
          errors: [`Action '${request.action}' not permitted`]
        };
      }

      // Check resource permission
      const hasResourceAccess = capability.resources.some(
        (resource) =>
          request.resource === resource ||
          request.resource.startsWith(resource) ||
          resource === '*'
      );

      if (!hasResourceAccess) {
        return {
          valid: false,
          errors: [`Resource '${request.resource}' not accessible`]
        };
      }

      // Evaluate conditions
      if (capability.conditions && request.context) {
        const conditionErrors = this.evaluateConditions(
          capability.conditions,
          request.context
        );
        if (conditionErrors.length > 0) {
          return { valid: false, errors: conditionErrors };
        }
      }

      return {
        valid: true,
        capability,
        subject: decoded.sub,
        allowedActions: capability.actions
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, errors: ['Token has expired'] };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, errors: ['Invalid token'] };
      }
      logger.error('Capability verification failed', { error });
      return { valid: false, errors: ['Verification failed'] };
    }
  }

  async revokeCapability(
    capabilityId: string,
    revokedBy: string,
    reason?: string
  ): Promise<void> {
    const result = await query<Capability>(
      'SELECT * FROM capabilities WHERE id = $1',
      [capabilityId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Capability', capabilityId);
    }

    const capability = this.mapCapabilityFromDb(result.rows[0]);

    // Verify revoker is the issuer or has admin capability
    if (revokedBy !== capability.issuer) {
      // Check if revoker has admin capability
      const adminCheck = await this.checkAdminCapability(revokedBy);
      if (!adminCheck) {
        throw new AuthorizationError('Not authorized to revoke this capability');
      }
    }

    await query(
      `UPDATE capabilities 
       SET status = $1, revoked_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [CapabilityStatus.REVOKED, capabilityId]
    );

    this.activeCapabilities.delete(capabilityId);

    // Get subject agent
    const subject = await identityManager.getAgentByDID(capability.subject);

    await identityManager.logActivity({
      id: generateId(),
      agentId: subject.id,
      activityType: ActivityType.CAPABILITY_REVOKED,
      description: `Capability revoked: ${reason || 'No reason provided'}`,
      timestamp: new Date(),
      metadata: { capabilityId, revokedBy, reason }
    });

    logger.info('Capability revoked', { capabilityId, revokedBy });
  }

  async listCapabilities(
    filters: {
      subject?: string;
      issuer?: string;
      status?: CapabilityStatus;
    } = {}
  ): Promise<Capability[]> {
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.subject) {
      whereClause += ` AND subject = $${paramIndex++}`;
      params.push(filters.subject);
    }

    if (filters.issuer) {
      whereClause += ` AND issuer = $${paramIndex++}`;
      params.push(filters.issuer);
    }

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    const result = await query<Capability>(
      `SELECT * FROM capabilities WHERE ${whereClause} ORDER BY issued_at DESC`,
      params
    );

    return result.rows.map(this.mapCapabilityFromDb);
  }

  async delegateCapability(
    capabilityId: string,
    delegator: string,
    delegatee: string,
    restrictions?: {
      actions?: string[];
      resources?: string[];
    },
    expiresInHours?: number
  ): Promise<CapabilityDelegation> {
    // Get original capability
    const result = await query<Capability>(
      'SELECT * FROM capabilities WHERE id = $1',
      [capabilityId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Capability', capabilityId);
    }

    const originalCapability = this.mapCapabilityFromDb(result.rows[0]);

    // Verify delegator is the subject
    if (originalCapability.subject !== delegator) {
      throw new AuthorizationError('Only the capability subject can delegate');
    }

    // Check if delegation is allowed
    if (!originalCapability.actions.includes('delegate')) {
      throw new AuthorizationError('Capability does not allow delegation');
    }

    const delegation: CapabilityDelegation = {
      id: generateId(),
      capabilityId,
      delegator,
      delegatee,
      restrictions: {
        actions: restrictions?.actions || originalCapability.actions,
        resources: restrictions?.resources || originalCapability.resources
      },
      delegatedAt: new Date(),
      expiresAt: expiresInHours
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : originalCapability.expiration
    };

    // Store delegation (in production, use a database table)
    logger.info('Capability delegated', {
      capabilityId,
      delegator,
      delegatee
    });

    return delegation;
  }

  private validateActionsAndResources(actions: string[], resources: string[]): void {
    const validActions = Object.values(DEFAULT_CAPABILITIES);
    const validResources = Object.values(DEFAULT_RESOURCES);

    for (const action of actions) {
      if (!validActions.includes(action) && action !== '*') {
        // Allow custom actions but log warning
        logger.warn('Custom action used', { action });
      }
    }

    for (const resource of resources) {
      const resourcePrefix = resource.split('/')[0];
      if (!validResources.includes(resourcePrefix) && resource !== '*') {
        logger.warn('Custom resource used', { resource });
      }
    }
  }

  private evaluateConditions(
    conditions: Array<{ type: string; parameter: string; operator: string; value: unknown }>,
    context: Record<string, unknown>
  ): string[] {
    const errors: string[] = [];

    for (const condition of conditions) {
      const contextValue = context[condition.parameter];

      switch (condition.operator) {
        case 'equals':
          if (contextValue !== condition.value) {
            errors.push(
              `Condition failed: ${condition.parameter} must equal ${condition.value}`
            );
          }
          break;
        case 'greater_than':
          if (typeof contextValue === 'number' && typeof condition.value === 'number') {
            if (contextValue <= condition.value) {
              errors.push(
                `Condition failed: ${condition.parameter} must be greater than ${condition.value}`
              );
            }
          }
          break;
        case 'less_than':
          if (typeof contextValue === 'number' && typeof condition.value === 'number') {
            if (contextValue >= condition.value) {
              errors.push(
                `Condition failed: ${condition.parameter} must be less than ${condition.value}`
              );
            }
          }
          break;
        case 'contains':
          if (
            typeof contextValue === 'string' &&
            typeof condition.value === 'string' &&
            !contextValue.includes(condition.value)
          ) {
            errors.push(
              `Condition failed: ${condition.parameter} must contain ${condition.value}`
            );
          }
          break;
        case 'in':
          if (Array.isArray(condition.value) && !condition.value.includes(contextValue)) {
            errors.push(
              `Condition failed: ${condition.parameter} must be in [${condition.value.join(', ')}]`
            );
          }
          break;
      }
    }

    return errors;
  }

  private async checkAdminCapability(did: string): Promise<boolean> {
    const result = await query<Capability>(
      `SELECT * FROM capabilities 
       WHERE subject = $1 
       AND actions @> '["admin"]'
       AND status = 'active'
       AND (expiration IS NULL OR expiration > CURRENT_TIMESTAMP)`,
      [did]
    );

    return result.rows.length > 0;
  }

  private mapCapabilityFromDb(row: Record<string, unknown>): Capability {
    return {
      id: row.id as string,
      subject: row.subject as string,
      issuer: row.issuer as string,
      actions: (row.actions as string[]) || [],
      resources: (row.resources as string[]) || [],
      conditions: (row.conditions as Array<{ type: string; parameter: string; operator: string; value: unknown }>) || undefined,
      notBefore: row.not_before ? new Date(row.not_before as Date) : undefined,
      expiration: row.expiration ? new Date(row.expiration as Date) : undefined,
      proof: (row.proof as CapabilityProof) || undefined,
      issuedAt: new Date(row.issued_at as Date),
      revokedAt: row.revoked_at ? new Date(row.revoked_at as Date) : undefined,
      status: row.status as CapabilityStatus
    };
  }
}

export const capabilityIssuer = new CapabilityIssuer();
