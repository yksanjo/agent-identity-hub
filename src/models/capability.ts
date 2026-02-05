export interface Capability {
  id: string;
  subject: string; // Agent DID
  issuer: string; // Issuer DID
  actions: string[];
  resources: string[];
  conditions?: CapabilityCondition[];
  notBefore?: Date;
  expiration?: Date;
  proof?: CapabilityProof;
  issuedAt: Date;
  revokedAt?: Date;
  status: CapabilityStatus;
}

export interface CapabilityCondition {
  type: ConditionType;
  parameter: string;
  operator: ConditionOperator;
  value: unknown;
}

export enum ConditionType {
  TIME = 'time',
  RATE_LIMIT = 'rate_limit',
  RESOURCE_SCOPE = 'resource_scope',
  CONTEXT = 'context'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  IN = 'in',
  BEFORE = 'before',
  AFTER = 'after'
}

export interface CapabilityProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  proofValue: string;
}

export enum CapabilityStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  PENDING = 'pending'
}

export interface CapabilityToken {
  token: string;
  capability: Capability;
  expiresIn: number;
}

export interface CapabilityRequest {
  subject: string;
  actions: string[];
  resources: string[];
  conditions?: CapabilityCondition[];
  expiresInHours?: number;
}

export interface CapabilityVerificationRequest {
  token: string;
  action: string;
  resource: string;
  context?: Record<string, unknown>;
}

export interface CapabilityVerificationResult {
  valid: boolean;
  capability?: Capability;
  subject?: string;
  allowedActions?: string[];
  errors?: string[];
}

export interface CapabilityDelegation {
  id: string;
  capabilityId: string;
  delegator: string;
  delegatee: string;
  restrictions?: {
    actions?: string[];
    resources?: string[];
    conditions?: CapabilityCondition[];
  };
  delegatedAt: Date;
  expiresAt?: Date;
}

export const DEFAULT_CAPABILITIES = {
  READ: 'read',
  WRITE: 'write',
  EXECUTE: 'execute',
  ADMIN: 'admin',
  DELEGATE: 'delegate',
  VERIFY: 'verify',
  ATTEST: 'attest'
} as const;

export const DEFAULT_RESOURCES = {
  AGENTS: 'agents',
  IDENTITIES: 'identities',
  CAPABILITIES: 'capabilities',
  ATTESTATIONS: 'attestations',
  MESSAGES: 'messages',
  SYSTEM: 'system'
} as const;
