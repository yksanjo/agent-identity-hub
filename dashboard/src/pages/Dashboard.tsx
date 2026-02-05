import React from 'react';
import { useAgents } from '../hooks/useAgents';
import { useWebSocket, useAnomalyAlerts } from '../hooks/useWebSocket';
import { AgentCard } from '../components/AgentCard';
import { ActivityFeed } from '../components/ActivityFeed';
import { AnomalyAlert } from '../components/AnomalyAlert';
import { TrustScoreChart } from '../components/TrustScoreChart';
import { api } from '../utils/api';

export const Dashboard: React.FC = () => {
  const { agents, total, loading } = useAgents({ status: 'active' });
  const { isConnected } = useWebSocket();
  const anomalies = useAnomalyAlerts();
  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    // Fetch recent activity from all agents
    const fetchActivity = async () => {
      try {
        const activityPromises = agents.slice(0, 5).map(agent =>
          api.getAgentActivity(agent.id, 5)
        );
        const results = await Promise.all(activityPromises);
        const allActivity = results
          .flat()
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 20);
        setRecentActivity(allActivity);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      }
    };

    if (agents.length > 0) {
      fetchActivity();
    }
  }, [agents]);

  React.useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error);
  }, []);

  const avgTrustScore = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.trustScore, 0) / agents.length
    : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Dashboard</h1>
        <p style={{ color: '#888' }}>
          Real-time overview of your agent swarm
          {isConnected && (
            <span style={{ color: '#2ecc71', marginLeft: 8 }}>● Live</span>
          )}
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        <StatCard
          label="Total Agents"
          value={total}
          change="+2 this week"
          icon="🤖"
        />
        <StatCard
          label="Active Agents"
          value={agents.filter(a => a.status === 'active').length}
          change={`${((agents.filter(a => a.status === 'active').length / total) * 100).toFixed(0)}%`}
          icon="✅"
        />
        <StatCard
          label="Avg Trust Score"
          value={`${(avgTrustScore * 100).toFixed(1)}%`}
          change={avgTrustScore > 0.7 ? 'Good' : 'Needs attention'}
          icon="📊"
          color={avgTrustScore > 0.7 ? '#2ecc71' : '#f39c12'}
        />
        <StatCard
          label="Anomalies"
          value={anomalies.length}
          change="Last 24h"
          icon="⚠️"
          color={anomalies.length > 0 ? '#e74c3c' : '#2ecc71'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Main content */}
        <div>
          {/* Trust Score Overview */}
          <div
            style={{
              background: '#13131f',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Trust Score Overview</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {agents.slice(0, 5).map(agent => (
                <div
                  key={agent.id}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: 12,
                    background: '#1a1a2e',
                    borderRadius: 8
                  }}
                >
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                    {agent.name.slice(0, 15)}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: agent.trustScore > 0.7 ? '#2ecc71' : agent.trustScore > 0.5 ? '#f39c12' : '#e74c3c'
                    }}
                  >
                    {(agent.trustScore * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Agents */}
          <div style={{ background: '#13131f', borderRadius: 12, padding: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16
              }}
            >
              <h3>Recent Agents</h3>
              <a href="/agents" style={{ color: '#4ecdc4', fontSize: 12 }}>
                View all →
              </a>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                Loading...
              </div>
            ) : (
              agents.slice(0, 5).map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Anomalies */}
          <div
            style={{
              background: '#13131f',
              borderRadius: 12,
              padding: 20,
              marginBottom: 24
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Recent Anomalies</h3>
            {anomalies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                No anomalies detected
              </div>
            ) : (
              anomalies.slice(0, 5).map((msg, i) => (
                <AnomalyAlert
                  key={i}
                  anomaly={msg.payload as any}
                />
              ))
            )}
          </div>

          {/* Activity Feed */}
          <div style={{ background: '#13131f', borderRadius: 12, padding: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Recent Activity</h3>
            <ActivityFeed activities={recentActivity} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  change: string;
  icon: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, change, icon, color = '#4ecdc4' }) => (
  <div
    style={{
      background: '#13131f',
      borderRadius: 12,
      padding: 20,
      border: '1px solid #2a2a3a'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#888' }}>{change}</span>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 12, color: '#888' }}>{label}</div>
  </div>
);

export default Dashboard;
