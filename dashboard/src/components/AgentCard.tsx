import React from 'react';
import { Agent, AgentType, AgentStatus } from '../types';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  selected?: boolean;
}

const typeColors: Record<AgentType, string> = {
  [AgentType.ORCHESTRATOR]: '#ff6b6b',
  [AgentType.WORKER]: '#4ecdc4',
  [AgentType.VALIDATOR]: '#45b7d1',
  [AgentType.GATEWAY]: '#96ceb4',
  [AgentType.SPECIALIST]: '#feca57',
  [AgentType.USER_PROXY]: '#ff9ff3'
};

const statusColors: Record<AgentStatus, string> = {
  [AgentStatus.ACTIVE]: '#2ecc71',
  [AgentStatus.INACTIVE]: '#95a5a6',
  [AgentStatus.SUSPENDED]: '#f39c12',
  [AgentStatus.REVOKED]: '#e74c3c',
  [AgentStatus.PENDING]: '#3498db'
};

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, selected }) => {
  const trustColor = agent.trustScore >= 0.8 
    ? '#2ecc71' 
    : agent.trustScore >= 0.5 
      ? '#f39c12' 
      : '#e74c3c';

  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 8,
        background: selected ? '#1a1a2e' : '#13131f',
        border: `1px solid ${selected ? '#4a4a6a' : '#2a2a3a'}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginBottom: 12
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: typeColors[agent.type] || '#888',
            marginRight: 8
          }}
        />
        <span style={{ fontWeight: 600, flex: 1 }}>{agent.name}</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            background: statusColors[agent.status],
            color: '#000',
            textTransform: 'uppercase'
          }}
        >
          {agent.status}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
        {agent.type} • {agent.did.slice(0, 20)}...
      </div>

      {agent.description && (
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
          {agent.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
            <span>Trust Score</span>
            <span style={{ color: trustColor }}>{(agent.trustScore * 100).toFixed(1)}%</span>
          </div>
          <div
            style={{
              height: 4,
              background: '#2a2a3a',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${agent.trustScore * 100}%`,
                height: '100%',
                background: trustColor,
                transition: 'width 0.3s'
              }}
            />
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{agent.reputation}</div>
          <div style={{ fontSize: 10, color: '#888' }}>Rep</div>
        </div>
      </div>

      {agent.capabilities.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {agent.capabilities.slice(0, 3).map((cap, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                background: '#2a2a3a',
                borderRadius: 4,
                color: '#aaa'
              }}
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span style={{ fontSize: 10, color: '#666' }}>
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentCard;
