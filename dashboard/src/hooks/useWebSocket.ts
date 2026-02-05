import { useEffect, useState, useCallback } from 'react';
import { websocket } from '../utils/websocket';
import { WebSocketMessage } from '../types';

export function useWebSocket(channel?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    websocket.connect();
    setIsConnected(websocket.isConnected());

    // Subscribe to channel if provided
    if (channel) {
      websocket.subscribe(channel);
    }

    // Listen for all messages
    const unsubscribe = websocket.onMessage('*', (message) => {
      setLastMessage(message);
      setIsConnected(true);
    });

    return () => {
      unsubscribe();
      if (channel) {
        websocket.unsubscribe(channel);
      }
    };
  }, [channel]);

  return { isConnected, lastMessage };
}

export function useWebSocketMessages(type: string) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    websocket.connect();

    const unsubscribe = websocket.onMessage(type, (message) => {
      setMessages((prev) => [...prev.slice(-49), message]); // Keep last 50 messages
    });

    return unsubscribe;
  }, [type]);

  return messages;
}

export function useTrustUpdates() {
  return useWebSocketMessages('trust_update');
}

export function useAnomalyAlerts() {
  return useWebSocketMessages('anomaly_alert');
}

export function useAgentActivity() {
  return useWebSocketMessages('agent_activity');
}
