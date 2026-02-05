export * from './agent';
export * from './identity';
export * from './capability';
export * from './attestation';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  timestamp: string;
  requestId: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: string;
}

export enum WebSocketMessageType {
  AGENT_ACTIVITY = 'agent_activity',
  TRUST_UPDATE = 'trust_update',
  ANOMALY_ALERT = 'anomaly_alert',
  CAPABILITY_GRANTED = 'capability_granted',
  ATTESTATION_ISSUED = 'attestation_issued',
  IDENTITY_UPDATED = 'identity_updated',
  SYSTEM_NOTIFICATION = 'system_notification'
}

export interface TrustScoreCalculation {
  agentId: string;
  baseScore: number;
  attestations: number;
  positiveInteractions: number;
  negativeInteractions: number;
  recencyWeight: number;
  anomalyPenalty: number;
  finalScore: number;
}

export interface AnomalyDetectionResult {
  agentId: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  confidence: number;
  indicators: AnomalyIndicator[];
  detectedAt: Date;
  recommendedAction?: string;
}

export enum AnomalyType {
  UNUSUAL_ACCESS_PATTERN = 'unusual_access_pattern',
  TRUST_MANIPULATION = 'trust_manipulation',
  CAPABILITY_ESCALATION = 'capability_escalation',
  IDENTITY_SPOOFING = 'identity_spoofing',
  BEHAVIOR_DEVIATION = 'behavior_deviation',
  COLLUSION_PATTERN = 'collusion_pattern'
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
