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
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
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
  establishedAt: string;
  lastInteractionAt: string;
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
  timestamp: string;
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

export interface Capability {
  id: string;
  subject: string;
  issuer: string;
  actions: string[];
  resources: string[];
  conditions?: CapabilityCondition[];
  notBefore?: string;
  expiration?: string;
  issuedAt: string;
  revokedAt?: string;
  status: CapabilityStatus;
}

export interface CapabilityCondition {
  type: string;
  parameter: string;
  operator: string;
  value: unknown;
}

export enum CapabilityStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  PENDING = 'pending'
}

export interface Attestation {
  id: string;
  type: string;
  issuer: string;
  subject: string;
  claims: Array<{ type: string; value: unknown; issuer?: string }>;
  issuedAt: string;
  expiresAt?: string;
  revocation?: {
    revokedAt: string;
    reason?: string;
    revokedBy: string;
  };
}

export interface Anomaly {
  agentId: string;
  anomalyType: string;
  severity: AnomalySeverity;
  confidence: number;
  indicators: AnomalyIndicator[];
  detectedAt: string;
  recommendedAction?: string;
}

export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AnomalyIndicator {
  type: string;
  value: number;
  threshold: number;
  description: string;
}

export interface TrustScoreData {
  date: string;
  score: number;
}

export interface GraphNode {
  id: string;
  did: string;
  name: string;
  type: AgentType;
  trustScore: number;
  status: AgentStatus;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  value: number;
}

export interface SocialGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
}
