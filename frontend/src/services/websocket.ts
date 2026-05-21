// Lightweight WebSocket client for live pipeline events.
// Backend pushes one of: { type: 'start' | 'node_complete' | 'telemetry_replay' | 'ping' | 'done' | 'error', ... }.

export type WSEvent =
  | { type: 'start'; session_id: string; query: string; timestamp: number }
  | { type: 'node_complete'; node: string; status?: string; papers?: number; chunks?: number; analyses?: number; audits?: number; telemetry_event?: Record<string, unknown> | null; timestamp: number }
  | { type: 'telemetry_replay'; agent?: string; status?: string; timestamp?: number; [k: string]: unknown }
  | { type: 'ping'; timestamp: number }
  | { type: 'done'; status?: string; timestamp: number }
  | { type: 'error'; error: string; timestamp: number };

type EventHandler = (event: WSEvent) => void;
type StatusHandler = (connected: boolean) => void;

import { buildWsUrl } from './api';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private onEvent: EventHandler | null = null;
  private onStatusChange: StatusHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 4;
  private reconnectDelay = 1000;
  private closedByClient = false;

  connect(sessionId: string, onEvent: EventHandler, onStatusChange: StatusHandler): void {
    this.disconnect();
    this.sessionId = sessionId;
    this.onEvent = onEvent;
    this.onStatusChange = onStatusChange;
    this.closedByClient = false;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (!this.sessionId || !this.onEvent || !this.onStatusChange) return;
    try {
      this.ws = new WebSocket(buildWsUrl(`/ws/v1/synthesis/${this.sessionId}`));
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange?.(true);
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          this.onEvent?.(data);
          // Auto-close on terminal events; backend will also close.
          if (data.type === 'done' || data.type === 'error') {
            this.closedByClient = true;
            this.ws?.close();
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };
      this.ws.onclose = () => {
        this.onStatusChange?.(false);
        if (!this.closedByClient) this.attemptReconnect();
      };
      this.ws.onerror = () => {
        // onclose will fire next; reconnect there.
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    setTimeout(() => this.attemptConnection(), delay);
  }

  disconnect(): void {
    this.closedByClient = true;
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
    this.onEvent = null;
    this.onStatusChange = null;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();
