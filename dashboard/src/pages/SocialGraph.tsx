import React, { useState, useEffect } from 'react';
import { SocialGraph as GraphVisualization } from '../components/SocialGraph';
import { AgentCard } from '../components/AgentCard';
import { api } from '../utils/api';
import { GraphNode, Agent } from '../types';

export const SocialGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: any[] }>({
    nodes: [],
    links: []
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setLoading(true);
        const data = await api.getSocialGraph();
        setGraphData(data);
      } catch (err) {
        console.error('Failed to fetch graph:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, []);

  useEffect(() => {
    if (selectedNode) {
      api.getAgent(selectedNode.id)
        .then(data => setSelectedAgent(data.agent))
        .catch(console.error);
    } else {
      setSelectedAgent(null);
    }
  }, [selectedNode]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Social Graph</h1>
        <p style={{ color: '#888' }}>Visualize agent relationships and interactions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        {/* Graph visualization */}
        <div
          style={{
            background: '#13131f',
            borderRadius: 12,
            padding: 20,
            height: 600
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
              Loading graph...
            </div>
          ) : (
            <GraphVisualization
              nodes={graphData.nodes}
              links={graphData.links}
              onNodeClick={setSelectedNode}
              selectedNode={selectedNode?.id}
              width={750}
              height={560}
            />
          )}
        </div>

        {/* Sidebar */}
        <div>
          {selectedAgent ? (
            <div>
              <h3 style={{ marginBottom: 16 }}>Selected Agent</h3>
              <AgentCard agent={selectedAgent} />
              
              <div style={{ marginTop: 24, background: '#13131f', borderRadius: 12, padding: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Actions</h4>
                <button
                  style={{
                    width: '100%',
                    padding: 12,
                    background: '#4ecdc4',
                    border: 'none',
                    borderRadius: 6,
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: 8
                  }}
                >
                  View Details
                </button>
                <button
                  style={{
                    width: '100%',
                    padding: 12,
                    background: 'transparent',
                    border: '1px solid #4ecdc4',
                    borderRadius: 6,
                    color: '#4ecdc4',
                    cursor: 'pointer'
                  }}
                >
                  Issue Capability
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#13131f', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <p style={{ color: '#888' }}>Click on a node to view agent details</p>
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 24, background: '#13131f', borderRadius: 12, padding: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Agent Types</h4>
            {[
              { type: 'orchestrator', color: '#ff6b6b', label: 'Orchestrator' },
              { type: 'worker', color: '#4ecdc4', label: 'Worker' },
              { type: 'validator', color: '#45b7d1', label: 'Validator' },
              { type: 'gateway', color: '#96ceb4', label: 'Gateway' },
              { type: 'specialist', color: '#feca57', label: 'Specialist' },
              { type: 'user_proxy', color: '#ff9ff3', label: 'User Proxy' }
            ].map(item => (
              <div
                key={item.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 8
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: item.color,
                    marginRight: 8
                  }}
                />
                <span style={{ fontSize: 12 }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, background: '#13131f', borderRadius: 12, padding: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Trust Score</h4>
            <div style={{ fontSize: 11, color: '#888' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 16, height: 2, background: '#2ecc71', marginRight: 8 }} />
                High (&gt;80%)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ width: 16, height: 2, background: '#f39c12', marginRight: 8 }} />
                Medium (50-80%)
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 16, height: 2, background: '#e74c3c', marginRight: 8 }} />
                Low (&lt;50%)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialGraph;
