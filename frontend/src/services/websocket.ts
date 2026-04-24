import type { TelemetryEvent } from '@/types';

const WS_BASE = 'ws://localhost:8000';

type MessageHandler = (event: TelemetryEvent) => void;
type StatusHandler = (connected: boolean) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private onMessage: MessageHandler | null = null;
  private onStatusChange: StatusHandler | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(
    sessionId: string,
    onMessage: MessageHandler,
    onStatusChange: StatusHandler
  ): void {
    this.sessionId = sessionId;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.attemptConnection();
  }

  private attemptConnection(): void {
    if (!this.sessionId || !this.onMessage || !this.onStatusChange) return;

    this.onStatusChange(false);
    this.ws?.close();

    try {
      this.ws = new WebSocket(`${WS_BASE}/ws/v1/synthesis/${this.sessionId}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TelemetryEvent;
          this.onMessage?.(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.onStatusChange?.(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.attemptConnection();
    }, delay);
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
    this.onMessage = null;
    this.onStatusChange = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();