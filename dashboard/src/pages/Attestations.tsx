import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Attestation } from '../types';

export const Attestations: React.FC = () => {
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const fetchAttestations = async () => {
      try {
        setLoading(true);
        const data = await api.getAttestations({ limit: 50 });
        setAttestations(data.attestations);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch attestations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttestations();
  }, []);

  const handleCreateAttestation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await api.createAttestation({
        type: formData.get('type') as string,
        subject: formData.get('subject') as string,
        claims: [{ type: 'assertion', value: formData.get('claim') }]
      });
      setShowCreateModal(false);
      // Refresh list
      const data = await api.getAttestations({ limit: 50 });
      setAttestations(data.attestations);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to create attestation:', err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Attestations</h1>
        <p style={{ color: '#888' }}>View and create cryptographic attestations</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <button
          onClick={() => setShowCreateModal(true)}
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
          + Create Attestation
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          Loading attestations...
        </div>
      ) : (
        <div style={{ background: '#13131f', borderRadius: 12 }}>
          <div style={{ padding: 16, borderBottom: '1px solid #2a2a3a' }}>
            Total: {total} attestations
          </div>
          
          {attestations.map(attestation => (
            <div
              key={attestation.id}
              style={{
                padding: 20,
                borderBottom: '1px solid #2a2a3a'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    background: '#2a2a3a',
                    borderRadius: 4,
                    textTransform: 'uppercase'
                  }}
                >
                  {attestation.type.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {new Date(attestation.issuedAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>Issuer</div>
                  <div style={{ fontSize: 12 }}>{attestation.issuer.slice(0, 25)}...</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>Subject</div>
                  <div style={{ fontSize: 12 }}>{attestation.subject.slice(0, 25)}...</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>Claims</div>
                {attestation.claims.map((claim, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      padding: 8,
                      background: '#1a1a2e',
                      borderRadius: 4,
                      marginBottom: 4
                    }}
                  >
                    <span style={{ color: '#4ecdc4' }}>{claim.type}:</span>{' '}
                    {typeof claim.value === 'string' ? claim.value : JSON.stringify(claim.value)}
                  </div>
                ))}
              </div>

              {attestation.revocation && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 8,
                    background: 'rgba(231, 76, 60, 0.1)',
                    borderRadius: 4,
                    fontSize: 11,
                    color: '#e74c3c'
                  }}
                >
                  ⚠️ Revoked: {attestation.revocation.reason || 'No reason provided'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Attestation Modal */}
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
            <h2 style={{ marginBottom: 20 }}>Create Attestation</h2>
            
            <form onSubmit={handleCreateAttestation}>
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
                  <option value="identity_verification">Identity Verification</option>
                  <option value="capability_authorization">Capability Authorization</option>
                  <option value="behavior_assertion">Behavior Assertion</option>
                  <option value="trust_assertion">Trust Assertion</option>
                  <option value="completion_certificate">Completion Certificate</option>
                  <option value="membership">Membership</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

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

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 4 }}>
                  Claim *
                </label>
                <textarea
                  name="claim"
                  required
                  rows={3}
                  placeholder="Enter claim value..."
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
                  Create Attestation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attestations;
