import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Capability, CapabilityStatus } from '../types';

export const Capabilities: React.FC = () => {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        setLoading(true);
        const data = await api.getCapabilities();
        setCapabilities(data);
      } catch (err) {
        console.error('Failed to fetch capabilities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCapabilities();
  }, []);

  const handleIssueCapability = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await api.issueCapability({
        subject: formData.get('subject') as string,
        actions: (formData.get('actions') as string).split(',').map(s => s.trim()),
        resources: (formData.get('resources') as string).split(',').map(s => s.trim()),
        expiresInHours: parseInt(formData.get('expiresInHours') as string) || undefined
      });
      setShowIssueModal(false);
      // Refresh list
      const data = await api.getCapabilities();
      setCapabilities(data);
    } catch (err) {
      console.error('Failed to issue capability:', err);
    }
  };

  const getStatusColor = (status: CapabilityStatus) => {
    switch (status) {
      case CapabilityStatus.ACTIVE: return '#2ecc71';
      case CapabilityStatus.EXPIRED: return '#95a5a6';
      case CapabilityStatus.REVOKED: return '#e74c3c';
      case CapabilityStatus.PENDING: return '#f39c12';
      default: return '#888';
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Capabilities</h1>
        <p style={{ color: '#888' }}>Manage capability-based access control tokens</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button
          onClick={() => setShowIssueModal(true)}
          style={{
            padding: '10px 20px',
            background: '#4ecdc4',
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Issue Capability
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          Loading capabilities...
        </div>
      ) : (
        <div style={{ background: '#13131f', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, color: '#888' }}>Subject</th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, color: '#888' }}>Actions</th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, color: '#888' }}>Resources</th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, color: '#888' }}>Status</th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, color: '#888' }}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map(cap => (
                <tr key={cap.id} style={{ borderTop: '1px solid #2a2a3a' }}>
                  <td style={{ padding: 16, fontSize: 13 }}>
                    {cap.subject.slice(0, 20)}...
                  </td>
                  <td style={{ padding: 16, fontSize: 13 }}>
                    {cap.actions.slice(0, 3).join(', ')}
                    {cap.actions.length > 3 && ` +${cap.actions.length - 3}`}
                  </td>
                  <td style={{ padding: 16, fontSize: 13 }}>
                    {cap.resources.slice(0, 2).join(', ')}
                    {cap.resources.length > 2 && ` +${cap.resources.length - 2}`}
                  </td>
                  <td style={{ padding: 16 }}>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 11,
                        background: getStatusColor(cap.status),
                        color: '#000',
                        textTransform: 'uppercase'
                      }}
                    >
                      {cap.status}
                    </span>
                  </td>
                  <td style={{ padding: 16, fontSize: 13, color: '#888' }}>
                    {cap.expiration 
                      ? new Date(cap.expiration).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Issue Capability Modal */}
      {showIssueModal && (
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
            <h2 style={{ marginBottom: 20 }}>Issue Capability</h2>
            
            <form onSubmit={handleIssueCapability}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Subject DID *
                </label>
                <input
                  name="subject"
                  type="text"
                  required
                  placeholder="did:ethr:0x..."
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
                  Actions (comma-separated) *
                </label>
                <input
                  name="actions"
                  type="text"
                  required
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

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Resources (comma-separated) *
                </label>
                <input
                  name="resources"
                  type="text"
                  required
                  placeholder="agents/*, capabilities/*"
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

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Expires In (hours)
                </label>
                <input
                  name="expiresInHours"
                  type="number"
                  min={1}
                  max={8760}
                  defaultValue={24}
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
                  onClick={() => setShowIssueModal(false)}
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
                  style={{
                    padding: '10px 20px',
                    background: '#4ecdc4',
                    border: 'none',
                    borderRadius: 6,
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Issue Capability
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Capabilities;
