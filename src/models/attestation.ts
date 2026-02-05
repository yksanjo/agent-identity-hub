export interface Attestation {
  id: string;
  type: AttestationType;
  issuer: string; // DID of the issuer
  subject: string; // DID of the subject
  claims: AttestationClaim[];
  issuedAt: Date;
  expiresAt?: Date;
  revocation?: RevocationInfo;
  proof: AttestationProof;
  metadata?: Record<string, unknown>;
}

export interface AttestationClaim {
  type: string;
  value: unknown;
  issuer?: string;
}

export interface AttestationProof {
  type: string;
  created: string;
  proofPurpose: string;
  verificationMethod: string;
  proofValue: string;
  challenge?: string;
  domain?: string;
}

export enum AttestationType {
  IDENTITY_VERIFICATION = 'identity_verification',
  CAPABILITY_AUTHORIZATION = 'capability_authorization',
  BEHAVIOR_ASSERTION = 'behavior_assertion',
  TRUST_ASSERTION = 'trust_assertion',
  COMPLETION_CERTIFICATE = 'completion_certificate',
  MEMBERSHIP = 'membership',
  CUSTOM = 'custom'
}

export interface RevocationInfo {
  revokedAt: Date;
  reason?: string;
  revokedBy: string;
}

export interface AttestationRequest {
  type: AttestationType;
  subject: string;
  claims: Omit<AttestationClaim, 'issuer'>[];
  expiresInHours?: number;
  metadata?: Record<string, unknown>;
}

export interface AttestationVerificationResult {
  valid: boolean;
  attestation?: Attestation;
  errors?: string[];
  warnings?: string[];
}

export interface AttestationChain {
  attestations: Attestation[];
  rootIssuer: string;
  subject: string;
  chainValid: boolean;
  trustScore: number;
}

export interface BehaviorAttestation {
  id: string;
  subject: string;
  behavior: BehaviorType;
  confidence: number;
  evidence: BehaviorEvidence[];
  attestedAt: Date;
  expiresAt?: Date;
}

export enum BehaviorType {
  NORMAL = 'normal',
  SUSPICIOUS = 'suspicious',
  MALICIOUS = 'malicious',
  EXCEPTIONAL = 'exceptional',
  COOPERATIVE = 'cooperative',
  UNRELIABLE = 'unreliable'
}

export interface BehaviorEvidence {
  type: string;
  description: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface AttestationFilter {
  issuer?: string;
  subject?: string;
  type?: AttestationType;
  validOnly?: boolean;
  issuedAfter?: Date;
  issuedBefore?: Date;
}
