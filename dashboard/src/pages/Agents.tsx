import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents, useCreateAgent } from '../hooks/useAgents';
import { AgentCard } from '../components/AgentCard';
import { Agent, AgentType, AgentStatus } from '../types';

export const Agents: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AgentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<AgentStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { agents, total, loading, refetch } = useAgents({
    search: search || undefined,
    type: filterType || undefined,
    status: filterStatus || undefined
  });
  
  const { createAgent, loading: creating } = useCreateAgent();
  const navigate = useNavigate();

  const handleCreateAgent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createAgent({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        type: formData.get('type') as AgentType,
        capabilities: (formData.get('capabilities') as string).split(',').map(s => s.trim()).filter(Boolean)
      });
      setShowCreateModal(false);
      refetch();
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Agents</h1>
        <p style={{ color: '#888' }}>Manage your AI agent identities</p>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap'
        }}
      >
        <input
          type="text"
          placeholder="Search agents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '10px 16px',
            background: '#13131f',
            border: '1px solid #2a2a3a',
            borderRadius: 8,
            color: '#e0e0e0',
            minWidth: 250
          }}
        />
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as AgentType)}
          style={{
            padding: '10px 16px',
            background: '#13131f',
            border: '1px solid #2a2a3a',
            borderRadius: 8,
            color: '#e0e0e0'
          }}
        >
          <option value="">All Types</option>
          {Object.values(AgentType).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as AgentStatus)}
          style={{
            padding: '10px 16px',
            background: '#13131f',
            border: '1px solid #2a2a3a',
            borderRadius: 8,
            color: '#e0e0e0'
          }}
        >
          <option value="">All Status</option>
          {Object.values(AgentStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            marginLeft: 'auto',
            padding: '10px 20px',
            background: '#4ecdc4',
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Create Agent
        </button>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 16, color: '#888' }}>
        Showing {agents.length} of {total} agents
      </div>

      {/* Agent grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          Loading agents...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => navigate(`/agents/${agent.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            style={{
              background: '#13131f',
              borderRadius: 12,
              padding: 24,
              width: 500,
              maxWidth: '90%'
            }}
          >
            <h2 style={{ marginBottom: 20 }}>Create New Agent</h2>
            
            <form onSubmit={handleCreateAgent}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: 6,
                    color: '#e0e0e0'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Type *
                </label>
                <select
                  name="type"
                  required
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: 6,
                    color: '#e0e0e0'
                  }}
                >
                  {Object.values(AgentType).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Capabilities (comma-separated)
                </label>
                <input
                  name="capabilities"
                  type="text"
                  placeholder="read, write, execute"
                  style={{
                    width: '100%',
                    padding: 10,
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: 6,
                    color: '#e0e0e0'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #666',
                    borderRadius: 6,
                    color: '#e0e0e0',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '10px 20px',
                    background: '#4ecdc4',
                    border: 'none',
                    borderRadius: 6,
                    color: '#000',
                    fontWeight: 600,
                    cursor: creating ? 'not-allowed' : 'pointer',
                    opacity: creating ? 0.7 : 1
                  }}
                >
                  {creating ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
