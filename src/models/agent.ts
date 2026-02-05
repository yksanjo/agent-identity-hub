export interface Agent {
  id: string;
  did: string;
  name: string;
  description?: string;
  type: AgentType;
  publicKey: string;
  trustScore: number;
  reputation: number;
  status: AgentStatus;
  capabilities: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  WORKER = 'worker',
  VALIDATOR = 'validator',
  GATEWAY = 'gateway',
  SPECIALIST = 'specialist',
  USER_PROXY = 'user_proxy'
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  PENDING = 'pending'
}

export interface AgentRelationship {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  relationshipType: RelationshipType;
  trustLevel: number;
  permissions: string[];
  establishedAt: Date;
  lastInteractionAt: Date;
  interactionCount: number;
  metadata: Record<string, unknown>;
}

export enum RelationshipType {
  DELEGATES_TO = 'delegates_to',
  VERIFIES = 'verifies',
  COMMUNICATES_WITH = 'communicates_with',
  SUPERVISES = 'supervises',
  DEPENDS_ON = 'depends_on',
  REPLACES = 'replaces'
}

export interface AgentActivity {
  id: string;
  agentId: string;
  activityType: ActivityType;
  description: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
  relatedAgentIds?: string[];
}

export enum ActivityType {
  IDENTITY_CREATED = 'identity_created',
  IDENTITY_UPDATED = 'identity_updated',
  CAPABILITY_GRANTED = 'capability_granted',
  CAPABILITY_REVOKED = 'capability_revoked',
  ATTESTATION_ISSUED = 'attestation_issued',
  ATTESTATION_VERIFIED = 'attestation_verified',
  INTERACTION = 'interaction',
  ANOMALY_DETECTED = 'anomaly_detected',
  TRUST_SCORE_UPDATED = 'trust_score_updated'
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  type: AgentType;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  status?: AgentStatus;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentTrustUpdate {
  agentId: string;
  newScore: number;
  reason: string;
  timestamp: Date;
}
