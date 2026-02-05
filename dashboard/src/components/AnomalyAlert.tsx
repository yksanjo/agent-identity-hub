import React from 'react';
import { Anomaly, AnomalySeverity } from '../types';

interface AnomalyAlertProps {
  anomaly: Anomaly;
  onResolve?: () => void;
}

const severityColors: Record<AnomalySeverity, string> = {
  [AnomalySeverity.LOW]: '#3498db',
  [AnomalySeverity.MEDIUM]: '#f39c12',
  [AnomalySeverity.HIGH]: '#e67e22',
  [AnomalySeverity.CRITICAL]: '#e74c3c'
};

const severityLabels: Record<AnomalySeverity, string> = {
  [AnomalySeverity.LOW]: 'Low',
  [AnomalySeverity.MEDIUM]: 'Medium',
  [AnomalySeverity.HIGH]: 'High',
  [AnomalySeverity.CRITICAL]: 'Critical'
};

export const AnomalyAlert: React.FC<AnomalyAlertProps> = ({ anomaly, onResolve }) => {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        background: 'rgba(231, 76, 60, 0.1)',
        border: `1px solid ${severityColors[anomaly.severity]}`,
        marginBottom: 12
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 20, marginRight: 8 }}>⚠️</span>
        <span style={{ fontWeight: 600, flex: 1 }}>
          {anomaly.anomalyType.replace(/_/g, ' ')}
        </span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 12,
            background: severityColors[anomaly.severity],
            color: '#fff',
            textTransform: 'uppercase'
          }}
        >
          {severityLabels[anomaly.severity]}
        </span>
      </div>

      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        Agent: {anomaly.agentId.slice(0, 16)}...
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
          <span>Confidence</span>
          <span>{(anomaly.confidence * 100).toFixed(1)}%</span>
        </div>
        <div style={{ height: 4, background: '#2a2a3a', borderRadius: 2 }}>
          <div
            style={{
              width: `${anomaly.confidence * 100}%`,
              height: '100%',
              background: severityColors[anomaly.severity],
              borderRadius: 2
            }}
          />
        </div>
      </div>

      {anomaly.indicators.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Indicators:</div>
          {anomaly.indicators.map((indicator, i) => (
            <div key={i} style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
              • {indicator.description}
            </div>
          ))}
        </div>
      )}

      {anomaly.recommendedAction && (
        <div style={{ fontSize: 11, color: '#f39c12', marginBottom: 8 }}>
          💡 {anomaly.recommendedAction}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#666' }}>
          {new Date(anomaly.detectedAt).toLocaleString()}
        </span>
        {onResolve && (
          <button
            onClick={onResolve}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              background: 'transparent',
              border: '1px solid #666',
              borderRadius: 4,
              color: '#e0e0e0',
              cursor: 'pointer'
            }}
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
};

export default AnomalyAlert;
