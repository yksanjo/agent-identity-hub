import { createLogger } from '../utils/logger';
import { query } from '../utils/db';
import { identityManager } from './identity-manager';
import {
  Attestation,
  AttestationType,
  AttestationRequest,
  AttestationVerificationResult,
  AttestationChain,
  BehaviorAttestation,
  BehaviorType,
  BehaviorEvidence,
  AttestationFilter
} from '../models/attestation';
import { ActivityType } from '../models/agent';
import { generateId, hashAttestation, signData } from '../utils/crypto';
import { NotFoundError, AuthorizationError, ValidationError } from '../utils/errors';

const logger = createLogger('attestation-service');

export class AttestationService {
  async createAttestation(
    issuerDid: string,
    request: AttestationRequest
  ): Promise<Attestation> {
    // Verify issuer exists and is active
    const issuer = await identityManager.getAgentByDID(issuerDid);
    if (issuer.status !== 'active') {
      throw new AuthorizationError('Issuer is not active');
    }

    // Verify subject exists
    const subject = await identityManager.getAgentByDID(request.subject);

    const attestationId = `urn:attest:${generateId()}`;
    const now = new Date();
    const expiresAt = request.expiresInHours
      ? new Date(now.getTime() + request.expiresInHours * 60 * 60 * 1000)
      : undefined;

    // Add issuer to claims
    const claimsWithIssuer = request.claims.map((claim) => ({
      ...claim,
      issuer: issuerDid
    }));

    // Create attestation object for signing
    const attestationData = {
      id: attestationId,
      type: request.type,
      issuer: issuerDid,
      subject: request.subject,
      claims: claimsWithIssuer,
      issuedAt: now.toISOString()
    };

    // Create proof
    const proof = {
      type: 'Ed25519Signature2020',
      created: now.toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${issuerDid}#keys-1`,
      proofValue: signData(
        hashAttestation(attestationData),
        issuer.publicKey
      )
    };

    const attestation: Attestation = {
      id: attestationId,
      type: request.type,
      issuer: issuerDid,
      subject: request.subject,
      claims: claimsWithIssuer,
      issuedAt: now,
      expiresAt,
      proof,
      metadata: request.metadata
    };

    // Store attestation
    await query(
      `INSERT INTO attestations 
       (id, type, issuer, subject, claims, issued_at, expires_at, proof, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        attestation.id,
        attestation.type,
        attestation.issuer,
        attestation.subject,
        JSON.stringify(attestation.claims),
        attestation.issuedAt,
        attestation.expiresAt,
        JSON.stringify(attestation.proof),
        JSON.stringify(attestation.metadata || {})
      ]
    );

    // Log activity
    await identityManager.logActivity({
      id: generateId(),
      agentId: subject.id,
      activityType: ActivityType.ATTESTATION_ISSUED,
      description: `Attestation issued: ${request.type}`,
      timestamp: now,
      metadata: {
        attestationId,
        issuer: issuerDid,
        type: request.type
      }
    });

    logger.info('Attestation created', {
      attestationId,
      type: request.type,
      issuer: issuerDid,
      subject: request.subject
    });

    return attestation;
  }

  async verifyAttestation(attestationId: string): Promise<AttestationVerificationResult> {
    const result = await query<Attestation>(
      'SELECT * FROM attestations WHERE id = $1',
      [attestationId]
    );

    if (result.rows.length === 0) {
      return { valid: false, errors: ['Attestation not found'] };
    }

    const attestation = this.mapAttestationFromDb(result.rows[0]);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check expiration
    if (attestation.expiresAt && attestation.expiresAt < new Date()) {
      errors.push('Attestation has expired');
    }

    // Check revocation
    if (attestation.revocation) {
      errors.push('Attestation has been revoked');
    }

    // Verify issuer still exists and is active
    try {
      const issuer = await identityManager.getAgentByDID(attestation.issuer);
      if (issuer.status !== 'active') {
        warnings.push('Issuer is no longer active');
      }
    } catch {
      warnings.push('Issuer not found');
    }

    // Verify subject exists
    try {
      await identityManager.getAgentByDID(attestation.subject);
    } catch {
      warnings.push('Subject not found');
    }

    // Verify proof (simplified for this implementation)
    if (!attestation.proof) {
      errors.push('Attestation has no proof');
    }

    return {
      valid: errors.length === 0,
      attestation,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  async getAttestation(attestationId: string): Promise<Attestation> {
    const result = await query<Attestation>(
      'SELECT * FROM attestations WHERE id = $1',
      [attestationId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Attestation', attestationId);
    }

    return this.mapAttestationFromDb(result.rows[0]);
  }

  async listAttestations(
    filter: AttestationFilter = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ attestations: Attestation[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filter.issuer) {
      whereClause += ` AND issuer = $${paramIndex++}`;
      params.push(filter.issuer);
    }

    if (filter.subject) {
      whereClause += ` AND subject = $${paramIndex++}`;
      params.push(filter.subject);
    }

    if (filter.type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(filter.type);
    }

    if (filter.validOnly) {
      whereClause += ` AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) AND revocation IS NULL`;
    }

    if (filter.issuedAfter) {
      whereClause += ` AND issued_at >= $${paramIndex++}`;
      params.push(filter.issuedAfter);
    }

    if (filter.issuedBefore) {
      whereClause += ` AND issued_at <= $${paramIndex++}`;
      params.push(filter.issuedBefore);
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM attestations WHERE ${whereClause}`,
      params
    );

    const attestationsResult = await query<Attestation>(
      `SELECT * FROM attestations WHERE ${whereClause}
       ORDER BY issued_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pagination.limit, offset]
    );

    return {
      attestations: attestationsResult.rows.map(this.mapAttestationFromDb),
      total: parseInt(countResult.rows[0].count, 10)
    };
  }

  async revokeAttestation(
    attestationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<void> {
    const attestation = await this.getAttestation(attestationId);

    // Verify revoker is the issuer or has admin capability
    if (revokedBy !== attestation.issuer) {
      throw new AuthorizationError('Not authorized to revoke this attestation');
    }

    await query(
      `UPDATE attestations 
       SET revocation = $1
       WHERE id = $2`,
      [
        JSON.stringify({
          revokedAt: new Date(),
          reason,
          revokedBy
        }),
        attestationId
      ]
    );

    logger.info('Attestation revoked', { attestationId, revokedBy, reason });
  }

  async buildAttestationChain(
    subject: string,
    attestationType?: AttestationType
  ): Promise<AttestationChain> {
    const filter: AttestationFilter = {
      subject,
      validOnly: true
    };

    if (attestationType) {
      filter.type = attestationType;
    }

    const { attestations } = await this.listAttestations(filter, { page: 1, limit: 100 });

    // Build chain by following issuer references
    const chain: Attestation[] = [];
    const visited = new Set<string>();

    for (const attestation of attestations) {
      if (!visited.has(attestation.id)) {
        chain.push(attestation);
        visited.add(attestation.id);

        // If attestation is about trust, follow the chain
        if (attestation.type === AttestationType.TRUST_ASSERTION) {
          // Get attestations from this issuer
          const issuerAttestations = await this.listAttestations(
            { issuer: attestation.issuer, validOnly: true },
            { page: 1, limit: 10 }
          );

          for (const issuerAtt of issuerAttestations.attestations) {
            if (!visited.has(issuerAtt.id)) {
              chain.push(issuerAtt);
              visited.add(issuerAtt.id);
            }
          }
        }
      }
    }

    // Calculate trust score from chain
    const trustScore = this.calculateChainTrustScore(chain);

    // Verify chain validity
    const chainValid = chain.every((att) => {
      // Simple validity check
      return !att.revocation && (!att.expiresAt || att.expiresAt > new Date());
    });

    return {
      attestations: chain,
      rootIssuer: chain[0]?.issuer || subject,
      subject,
      chainValid,
      trustScore
    };
  }

  async createBehaviorAttestation(
    subject: string,
    behavior: BehaviorType,
    confidence: number,
    evidence: BehaviorEvidence[],
    expiresInHours?: number
  ): Promise<BehaviorAttestation> {
    const behaviorAttestation: BehaviorAttestation = {
      id: generateId(),
      subject,
      behavior,
      confidence,
      evidence,
      attestedAt: new Date(),
      expiresAt: expiresInHours
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : undefined
    };

    // Store behavior attestation (in production, use a separate table)
    logger.info('Behavior attestation created', {
      id: behaviorAttestation.id,
      subject,
      behavior,
      confidence
    });

    return behaviorAttestation;
  }

  async getAttestationStats(did: string): Promise<{
    issued: number;
    received: number;
    verified: number;
    revoked: number;
    byType: Record<AttestationType, number>;
  }> {
    const issuedResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM attestations WHERE issuer = $1',
      [did]
    );

    const receivedResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM attestations WHERE subject = $1',
      [did]
    );

    const revokedResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM attestations WHERE issuer = $1 AND revocation IS NOT NULL',
      [did]
    );

    const byTypeResult = await query<{ type: AttestationType; count: string }>(
      'SELECT type, COUNT(*) FROM attestations WHERE subject = $1 GROUP BY type',
      [did]
    );

    const byType: Record<string, number> = {};
    for (const row of byTypeResult.rows) {
      byType[row.type] = parseInt(row.count, 10);
    }

    return {
      issued: parseInt(issuedResult.rows[0].count, 10),
      received: parseInt(receivedResult.rows[0].count, 10),
      verified: parseInt(receivedResult.rows[0].count, 10), // Simplified
      revoked: parseInt(revokedResult.rows[0].count, 10),
      byType: byType as Record<AttestationType, number>
    };
  }

  private calculateChainTrustScore(chain: Attestation[]): number {
    if (chain.length === 0) return 0.5;

    let totalScore = 0;
    let weight = 0;

    for (let i = 0; i < chain.length; i++) {
      const attestation = chain[i];
      const attWeight = 1 / (i + 1); // Older attestations have less weight

      // Base score for having an attestation
      let attScore = 0.5;

      // Boost for specific types
      if (attestation.type === AttestationType.TRUST_ASSERTION) {
        attScore = 0.8;
      } else if (attestation.type === AttestationType.IDENTITY_VERIFICATION) {
        attScore = 0.7;
      }

      // Adjust based on number of claims
      attScore += Math.min(attestation.claims.length * 0.05, 0.2);

      totalScore += attScore * attWeight;
      weight += attWeight;
    }

    return Math.min(totalScore / weight, 1.0);
  }

  private mapAttestationFromDb(row: Record<string, unknown>): Attestation {
    return {
      id: row.id as string,
      type: row.type as AttestationType,
      issuer: row.issuer as string,
      subject: row.subject as string,
      claims: (row.claims as Array<{ type: string; value: unknown; issuer?: string }>) || [],
      issuedAt: new Date(row.issued_at as Date),
      expiresAt: row.expires_at ? new Date(row.expires_at as Date) : undefined,
      revocation: row.revocation ? JSON.parse(row.revocation as string) : undefined,
      proof: row.proof ? JSON.parse(row.proof as string) : undefined,
      metadata: (row.metadata as Record<string, unknown>) || {}
    };
  }
}

export const attestationService = new AttestationService();
