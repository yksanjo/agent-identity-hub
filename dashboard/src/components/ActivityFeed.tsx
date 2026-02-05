import React from 'react';
import { AgentActivity, ActivityType } from '../types';

interface ActivityFeedProps {
  activities: AgentActivity[];
}

const activityIcons: Record<ActivityType, string> = {
  [ActivityType.IDENTITY_CREATED]: '🆕',
  [ActivityType.IDENTITY_UPDATED]: '✏️',
  [ActivityType.CAPABILITY_GRANTED]: '🔑',
  [ActivityType.CAPABILITY_REVOKED]: '🚫',
  [ActivityType.ATTESTATION_ISSUED]: '📜',
  [ActivityType.ATTESTATION_VERIFIED]: '✅',
  [ActivityType.INTERACTION]: '💬',
  [ActivityType.ANOMALY_DETECTED]: '⚠️',
  [ActivityType.TRUST_SCORE_UPDATED]: '📊'
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      {activities.map((activity) => (
        <div
          key={activity.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: 12,
            borderBottom: '1px solid #2a2a3a',
            transition: 'background 0.2s'
          }}
        >
          <span style={{ fontSize: 20, marginRight: 12, marginTop: 2 }}>
            {activityIcons[activity.activityType] || '📋'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#e0e0e0' }}>
              {activity.description}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
              {formatTime(activity.timestamp)} • {activity.activityType.replace(/_/g, ' ')}
            </div>
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                {JSON.stringify(activity.metadata).slice(0, 100)}...
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
