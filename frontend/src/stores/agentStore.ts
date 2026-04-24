import { create } from 'zustand';
import type { AgentState, TelemetryEvent, AGENT_ORDER, AgentName } from '@/types';
import { wsService } from '@/services/websocket';

const createInitialAgents = (): AgentState[] => [
  { id: 'librarian', name: 'Librarian', status: 'pending', isActive: false },
  { id: 'analyst', name: 'Analyst', status: 'pending', isActive: false },
  { id: 'critic', name: 'Critic', status: 'pending', isActive: false },
  { id: 'synthesizer', name: 'Synthesizer', status: 'pending', isActive: false },
];

interface AgentStoreState {
  agents: AgentState[];
  wsConnected: boolean;
  telemetry: TelemetryEvent[];
  
  updateAgentFromEvent: (event: TelemetryEvent) => void;
  setWsConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  agents: createInitialAgents(),
  wsConnected: false,
  telemetry: [],

  updateAgentFromEvent: (event: TelemetryEvent) => {
    set((state) => {
      const agentName = event.agent as AgentName;
      const agentIndex = AGENT_ORDER.indexOf(agentName);
      
      if (agentIndex === -1) return state;

      const newAgents = state.agents.map((agent, idx) => {
        if (idx < agentIndex) {
          return { ...agent, status: 'completed' as const, isActive: false };
        } else if (idx === agentIndex) {
          return { 
            ...agent, 
            status: event.status === 'completed' ? 'completed' as const : 'processing' as const,
            isActive: event.status === 'completed' || event.status === 'processing',
            timestamp: event.timestamp 
          };
        }
        return { ...agent, status: 'pending' as const, isActive: false };
      });

      return { 
        agents: newAgents, 
        telemetry: [...state.telemetry, event] 
      };
    });
  },

  setWsConnected: (connected: boolean) => set({ wsConnected: connected }),

  reset: () => set({
    agents: createInitialAgents(),
    wsConnected: false,
    telemetry: [],
  }),
}));

let wsConnection: { disconnect: () => void } | null = null;

export function connectAgentWebSocket(sessionId: string): void {
  if (wsConnection) {
    wsConnection.disconnect();
  }
  
  wsConnection = wsService.connect(
    sessionId,
    (event) => useAgentStore.getState().updateAgentFromEvent(event),
    (connected) => useAgentStore.getState().setWsConnected(connected)
  ) as unknown as { disconnect: () => void };
}

export function disconnectAgentWebSocket(): void {
  wsConnection?.disconnect();
  wsConnection = null;
}