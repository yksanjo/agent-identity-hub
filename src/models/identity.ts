export interface DIDDocument {
  id: string;
  '@context': string | string[];
  controller?: string | string[];
  verificationMethod: VerificationMethod[];
  authentication?: (string | VerificationMethod)[];
  assertionMethod?: (string | VerificationMethod)[];
  keyAgreement?: (string | VerificationMethod)[];
  capabilityInvocation?: (string | VerificationMethod)[];
  capabilityDelegation?: (string | VerificationMethod)[];
  service?: ServiceEndpoint[];
  created?: string;
  updated?: string;
}

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyHex?: string;
  publicKeyBase58?: string;
  publicKeyMultibase?: string;
  blockchainAccountId?: string;
  ethereumAddress?: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | string[];
}

export interface DIDResolutionResult {
  didResolutionMetadata: ResolutionMetadata;
  didDocument: DIDDocument | null;
  didDocumentMetadata: DocumentMetadata;
}

export interface ResolutionMetadata {
  contentType?: string;
  error?: ResolutionError;
  retrieved?: string;
  duration?: number;
}

export enum ResolutionError {
  INVALID_DID = 'invalidDid',
  NOT_FOUND = 'notFound',
  REPRESENTATION_NOT_SUPPORTED = 'representationNotSupported',
  CONFIGURATION_ERROR = 'configurationError'
}

export interface DocumentMetadata {
  created?: string;
  updated?: string;
  deactivated?: boolean;
  versionId?: string;
  nextUpdate?: string;
  nextVersionId?: string;
  equivalentId?: string[];
  canonicalId?: string;
}

export interface Identity {
  did: string;
  agentId: string;
  document: DIDDocument;
  privateKey?: string; // Only stored encrypted in production
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIdentityRequest {
  agentId: string;
  method?: string;
  publicKey?: string;
  services?: ServiceEndpoint[];
}

export interface IdentityVerificationResult {
  valid: boolean;
  did: string;
  issuer?: string;
  expiration?: Date;
  errors?: string[];
}
