import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { Agent, AgentActivity, TrustScoreData } from '../types';

export function useAgents(params?: { status?: string; type?: string; search?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAgents(params);
      setAgents(data.agents);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, [params?.status, params?.type, params?.search]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, total, loading, error, refetch: fetchAgents };
}

export function useAgent(id: string) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [relationships, setRelationships] = useState<any>(null);
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [trustHistory, setTrustHistory] = useState<TrustScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAgent(id);
      setAgent(data.agent);
      setRelationships(data.relationships);
      setActivity(data.activity);
      setTrustHistory(data.trustHistory);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, relationships, activity, trustHistory, loading, error, refetch: fetchAgent };
}

export function useCreateAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAgent = async (data: Partial<Agent>) => {
    try {
      setLoading(true);
      const result = await api.createAgent(data);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createAgent, loading, error };
}

export function useUpdateAgent(id: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateAgent = async (data: Partial<Agent>) => {
    try {
      setLoading(true);
      const result = await api.updateAgent(id, data);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { updateAgent, loading, error };
}
