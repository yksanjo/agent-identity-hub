import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3000';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  subscribe(channel: string): void {
    this.socket?.emit('subscribe', channel);
  }

  unsubscribe(channel: string): void {
    this.socket?.emit('unsubscribe', channel);
  }

  onMessage(type: string, callback: (message: WebSocketMessage) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    const callbacks = this.listeners.get(message.type);
    if (callbacks) {
      callbacks.forEach((callback) => callback(message));
    }

    // Also notify wildcard listeners
    const wildcardCallbacks = this.listeners.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach((callback) => callback(message));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocket = new WebSocketService();
