import { createLogger } from '../utils/logger';
import { query, transaction } from '../utils/db';
import { didService } from './did-service';
import {
  Agent,
  AgentStatus,
  AgentType,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentRelationship,
  RelationshipType,
  AgentActivity,
  ActivityType
} from '../models/agent';
import { Identity } from '../models/identity';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { generateId, generateUUID, encrypt } from '../utils/crypto';

const logger = createLogger('identity-manager');

export class IdentityManager {
  async createAgent(
    request: CreateAgentRequest,
    ownerDid?: string
  ): Promise<{ agent: Agent; identity: Identity; apiKey: string }> {
    return await transaction(async (client) => {
      // Create DID
      const { did, document } = await didService.createDID(
        'ethr',
        undefined,
        [
          {
            id: '#mcp',
            type: 'MCPService',
            serviceEndpoint: `${process.env.API_URL || 'http://localhost:3000'}/mcp`
          }
        ]
      );

      const agentId = generateId();
      const now = new Date();

      // Create agent record
      const agent: Agent = {
        id: agentId,
        did,
        name: request.name,
        description: request.description,
        type: request.type,
        publicKey: document.verificationMethod[0].publicKeyHex || '',
        trustScore: 0.5, // Default trust score
        reputation: 0,
        status: AgentStatus.ACTIVE,
        capabilities: request.capabilities || [],
        metadata: {
          ...request.metadata,
          ownerDid,
          createdBy: ownerDid || 'system'
        },
        createdAt: now,
        updatedAt: now,
        lastActiveAt: now
      };

      await client.query(
        `INSERT INTO agents (id, did, name, description, type, public_key, trust_score, 
         reputation, status, capabilities, metadata, created_at, updated_at, last_active_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          agent.id,
          agent.did,
          agent.name,
          agent.description,
          agent.type,
          agent.publicKey,
          agent.trustScore,
          agent.reputation,
          agent.status,
          JSON.stringify(agent.capabilities),
          JSON.stringify(agent.metadata),
          agent.createdAt,
          agent.updatedAt,
          agent.lastActiveAt
        ]
      );

      // Create identity record
      const identity: Identity = {
        did,
        agentId,
        document,
        createdAt: now,
        updatedAt: now
      };

      await client.query(
        `INSERT INTO identities (did, agent_id, document, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [identity.did, identity.agentId, JSON.stringify(identity.document), identity.createdAt, identity.updatedAt]
      );

      // Log activity
      await this.logActivityInternal(client, {
        id: generateId(),
        agentId,
        activityType: ActivityType.IDENTITY_CREATED,
        description: `Agent identity created: ${request.name}`,
        timestamp: now,
        metadata: { did, type: request.type }
      });

      // Generate API key (in production, use proper encryption)
      const apiKey = `aik_${generateUUID().replace(/-/g, '')}`;

      logger.info('Agent created', { agentId, did, type: request.type });

      return { agent, identity, apiKey };
    });
  }

  async getAgent(idOrDid: string): Promise<Agent> {
    const isDid = idOrDid.startsWith('did:');
    
    const result = await query<Agent>(
      `SELECT * FROM agents WHERE ${isDid ? 'did' : 'id'} = $1`,
      [idOrDid]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Agent', idOrDid);
    }

    return this.mapAgentFromDb(result.rows[0]);
  }

  async getAgentByDID(did: string): Promise<Agent> {
    return this.getAgent(did);
  }

  async listAgents(
    filters: {
      status?: AgentStatus;
      type?: AgentType;
      search?: string;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ agents: Agent[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;
    
    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(filters.type);
    }

    if (filters.search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM agents WHERE ${whereClause}`,
      params
    );

    const agentsResult = await query<Agent>(
      `SELECT * FROM agents WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, pagination.limit, offset]
    );

    return {
      agents: agentsResult.rows.map(this.mapAgentFromDb),
      total: parseInt(countResult.rows[0].count, 10)
    };
  }

  async updateAgent(
    agentId: string,
    request: UpdateAgentRequest
  ): Promise<Agent> {
    const agent = await this.getAgent(agentId);
    const now = new Date();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (request.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(request.name);
    }

    if (request.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(request.description);
    }

    if (request.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(request.status);
    }

    if (request.capabilities !== undefined) {
      updates.push(`capabilities = $${paramIndex++}`);
      values.push(JSON.stringify(request.capabilities));
    }

    if (request.metadata !== undefined) {
      const mergedMetadata = { ...agent.metadata, ...request.metadata };
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(mergedMetadata));
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(now);

    values.push(agentId);

    await query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    await this.logActivity({
      id: generateId(),
      agentId,
      activityType: ActivityType.IDENTITY_UPDATED,
      description: `Agent updated`,
      timestamp: now,
      metadata: { updates: Object.keys(request) }
    });

    return this.getAgent(agentId);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await transaction(async (client) => {
      const agent = await this.getAgent(agentId);

      // Deactivate DID
      await didService.deactivateDID(agent.did);

      // Delete agent (cascade will handle related records)
      await client.query('DELETE FROM agents WHERE id = $1', [agentId]);

      logger.info('Agent deleted', { agentId });
    });
  }

  async createRelationship(
    sourceAgentId: string,
    targetAgentId: string,
    relationshipType: RelationshipType,
    permissions: string[] = []
  ): Promise<AgentRelationship> {
    if (sourceAgentId === targetAgentId) {
      throw new ValidationError('Cannot create relationship with self');
    }

    // Verify both agents exist
    await this.getAgent(sourceAgentId);
    await this.getAgent(targetAgentId);

    const relationship: AgentRelationship = {
      id: generateId(),
      sourceAgentId,
      targetAgentId,
      relationshipType,
      trustLevel: 0.5,
      permissions,
      establishedAt: new Date(),
      lastInteractionAt: new Date(),
      interactionCount: 0,
      metadata: {}
    };

    await query(
      `INSERT INTO agent_relationships (id, source_agent_id, target_agent_id, 
       relationship_type, trust_level, permissions, established_at, 
       last_interaction_at, interaction_count, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (source_agent_id, target_agent_id, relationship_type)
       DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = CURRENT_TIMESTAMP`,
      [
        relationship.id,
        relationship.sourceAgentId,
        relationship.targetAgentId,
        relationship.relationshipType,
        relationship.trustLevel,
        JSON.stringify(relationship.permissions),
        relationship.establishedAt,
        relationship.lastInteractionAt,
        relationship.interactionCount,
        JSON.stringify(relationship.metadata)
      ]
    );

    return relationship;
  }

  async getRelationships(agentId: string): Promise<{
    incoming: AgentRelationship[];
    outgoing: AgentRelationship[];
  }> {
    const incomingResult = await query<AgentRelationship>(
      'SELECT * FROM agent_relationships WHERE target_agent_id = $1',
      [agentId]
    );

    const outgoingResult = await query<AgentRelationship>(
      'SELECT * FROM agent_relationships WHERE source_agent_id = $1',
      [agentId]
    );

    return {
      incoming: incomingResult.rows.map(this.mapRelationshipFromDb),
      outgoing: outgoingResult.rows.map(this.mapRelationshipFromDb)
    };
  }

  async recordInteraction(
    sourceAgentId: string,
    targetAgentId: string
  ): Promise<void> {
    await query(
      `UPDATE agent_relationships 
       SET interaction_count = interaction_count + 1,
           last_interaction_at = CURRENT_TIMESTAMP
       WHERE source_agent_id = $1 AND target_agent_id = $2`,
      [sourceAgentId, targetAgentId]
    );

    // Also update agent last active
    await query(
      'UPDATE agents SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
      [sourceAgentId]
    );
  }

  async getAgentActivity(
    agentId: string,
    limit: number = 50
  ): Promise<AgentActivity[]> {
    const result = await query<AgentActivity>(
      `SELECT * FROM agent_activities 
       WHERE agent_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [agentId, limit]
    );

    return result.rows.map(this.mapActivityFromDb);
  }

  async logActivity(activity: AgentActivity): Promise<void> {
    await this.logActivityInternal(null, activity);
  }

  private async logActivityInternal(
    client: any,
    activity: AgentActivity
  ): Promise<void> {
    const sql = `INSERT INTO agent_activities 
      (id, agent_id, activity_type, description, timestamp, metadata, related_agent_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    
    const params = [
      activity.id,
      activity.agentId,
      activity.activityType,
      activity.description,
      activity.timestamp,
      JSON.stringify(activity.metadata),
      JSON.stringify(activity.relatedAgentIds || [])
    ];

    if (client) {
      await client.query(sql, params);
    } else {
      await query(sql, params);
    }
  }

  private mapAgentFromDb(row: Record<string, unknown>): Agent {
    return {
      id: row.id as string,
      did: row.did as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as AgentType,
      publicKey: row.public_key as string,
      trustScore: parseFloat(row.trust_score as string),
      reputation: row.reputation as number,
      status: row.status as AgentStatus,
      capabilities: (row.capabilities as string[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.created_at as Date),
      updatedAt: new Date(row.updated_at as Date),
      lastActiveAt: new Date(row.last_active_at as Date)
    };
  }

  private mapRelationshipFromDb(row: Record<string, unknown>): AgentRelationship {
    return {
      id: row.id as string,
      sourceAgentId: row.source_agent_id as string,
      targetAgentId: row.target_agent_id as string,
      relationshipType: row.relationship_type as RelationshipType,
      trustLevel: parseFloat(row.trust_level as string),
      permissions: (row.permissions as string[]) || [],
      establishedAt: new Date(row.established_at as Date),
      lastInteractionAt: new Date(row.last_interaction_at as Date),
      interactionCount: row.interaction_count as number,
      metadata: (row.metadata as Record<string, unknown>) || {}
    };
  }

  private mapActivityFromDb(row: Record<string, unknown>): AgentActivity {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      activityType: row.activity_type as ActivityType,
      description: row.description as string,
      timestamp: new Date(row.timestamp as Date),
      metadata: (row.metadata as Record<string, unknown>) || {},
      relatedAgentIds: (row.related_agent_ids as string[]) || undefined
    };
  }
}

export const identityManager = new IdentityManager();
