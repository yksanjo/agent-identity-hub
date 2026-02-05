import {
  Agent,
  AgentActivity,
  Attestation,
  Capability,
  Anomaly,
  TrustScoreData,
  SocialGraph
} from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data.data;
}

export const api = {
  // Agents
  getAgents: (params?: { status?: string; type?: string; search?: string; page?: number; limit?: number }) =>
    fetchAPI<{ agents: Agent[]; total: number }>(`/agents?${new URLSearchParams(params as Record<string, string>)}`),
  
  getAgent: (id: string) =>
    fetchAPI<{ agent: Agent; relationships: any; activity: AgentActivity[]; trustHistory: TrustScoreData[] }>(`/agents/${id}`),
  
  createAgent: (data: Partial<Agent>) =>
    fetchAPI<{ agent: Agent; identity: { did: string }; apiKey: string }>('/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  updateAgent: (id: string, data: Partial<Agent>) =>
    fetchAPI<Agent>(`/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  
  deleteAgent: (id: string) =>
    fetchAPI<null>(`/agents/${id}`, { method: 'DELETE' }),

  // Relationships
  getAgentRelationships: (id: string) =>
    fetchAPI<{ incoming: any[]; outgoing: any[] }>(`/agents/${id}/relationships`),

  createRelationship: (id: string, data: { targetAgentId: string; relationshipType: string; permissions?: string[] }) =>
    fetchAPI<any>(`/agents/${id}/relationships`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Activity
  getAgentActivity: (id: string, limit?: number) =>
    fetchAPI<AgentActivity[]>(`/agents/${id}/activity?limit=${limit || 50}`),

  // Trust & Anomalies
  calculateTrustScore: (id: string) =>
    fetchAPI<any>(`/agents/${id}/trust-score`, { method: 'POST' }),
  
  detectAnomalies: (id: string) =>
    fetchAPI<Anomaly[]>(`/agents/${id}/anomalies`, { method: 'POST' }),

  // Capabilities
  getCapabilities: (params?: { subject?: string; issuer?: string; status?: string }) =>
    fetchAPI<Capability[]>(`/capabilities?${new URLSearchParams(params as Record<string, string>)}`),
  
  issueCapability: (data: { subject: string; actions: string[]; resources: string[]; expiresInHours?: number }) =>
    fetchAPI<any>('/capabilities', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  verifyCapability: (data: { token: string; action: string; resource: string }) =>
    fetchAPI<any>('/capabilities/verify', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Attestations
  getAttestations: (params?: { issuer?: string; subject?: string; type?: string; page?: number; limit?: number }) =>
    fetchAPI<{ attestations: Attestation[]; total: number }>(`/attestations?${new URLSearchParams(params as Record<string, string>)}`),
  
  createAttestation: (data: { type: string; subject: string; claims: Array<{ type: string; value: unknown }> }) =>
    fetchAPI<Attestation>('/attestations', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Identity
  resolveDID: (did: string) =>
    fetchAPI<any>(`/identity/resolve/${encodeURIComponent(did)}`),

  // Graph
  getSocialGraph: () =>
    fetchAPI<SocialGraph>('/agents/graph/social'),

  // Dashboard stats
  getDashboardStats: () =>
    fetchAPI<any>('/dashboard/stats')
};
