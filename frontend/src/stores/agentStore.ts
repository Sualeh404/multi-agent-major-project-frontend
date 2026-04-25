import { create } from 'zustand';
import type { AgentState, TelemetryEvent, AgentName, SynthesisResult } from '@/types';
import { AGENT_ORDER } from '@/types';

const createInitialAgents = (): AgentState[] => [
  { id: 'librarian', name: 'Librarian', status: 'pending', isActive: false },
  { id: 'analyst', name: 'Analyst', status: 'pending', isActive: false },
  { id: 'critic', name: 'Critic', status: 'pending', isActive: false },
  { id: 'synthesizer', name: 'Synthesizer', status: 'pending', isActive: false },
];

interface AgentStoreState {
  agents: AgentState[];
  telemetry: TelemetryEvent[];

  updateAgentFromEvent: (event: TelemetryEvent) => void;
  reset: () => void;
}

export const useAgentStore = create<AgentStoreState>((set) => ({
  agents: createInitialAgents(),
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
            isActive: true,
            timestamp: event.timestamp,
          };
        }
        return { ...agent, status: 'pending' as const, isActive: false };
      });

      return {
        agents: newAgents,
        telemetry: [...state.telemetry, event],
      };
    });
  },

  reset: () => set({
    agents: createInitialAgents(),
    telemetry: [],
  }),
}));

/**
 * Feed telemetry from a poll response into the agent store.
 * Deduplicates by comparing with already-processed event count.
 * Derives activity descriptions from the result data.
 */
export function feedTelemetryFromPoll(
  telemetryEvents: TelemetryEvent[],
  result: Partial<SynthesisResult>
): void {
  const store = useAgentStore.getState();
  const alreadyProcessed = store.telemetry.length;

  // Feed new telemetry events
  for (let i = alreadyProcessed; i < telemetryEvents.length; i++) {
    store.updateAgentFromEvent(telemetryEvents[i]);
  }

  // Optimistically mark the next agent as processing
  if (telemetryEvents.length > 0) {
    const lastEvent = telemetryEvents[telemetryEvents.length - 1];
    if (lastEvent.status === 'completed') {
      const lastIdx = AGENT_ORDER.indexOf(lastEvent.agent as AgentName);
      if (lastIdx >= 0 && lastIdx < AGENT_ORDER.length - 1) {
        const nextName = AGENT_ORDER[lastIdx + 1];
        const agents = useAgentStore.getState().agents;
        const nextAgent = agents.find(a => a.name === nextName);
        if (nextAgent && nextAgent.status === 'pending') {
          useAgentStore.setState(state => ({
            agents: state.agents.map(a =>
              a.name === nextName
                ? { ...a, status: 'processing' as const, isActive: true }
                : a
            ),
          }));
        }
      }
    }
  }

  // Derive descriptions from result data
  updateDescriptions(result);
}

function updateDescriptions(result: Partial<SynthesisResult>): void {
  const chunks = result.chunks || [];
  const analyses = result.analyses || [];
  const audits = result.audits || [];
  const synthesis = result.synthesis;

  const uniquePapers = new Set(chunks.map(c => c.paper_id)).size;

  useAgentStore.setState(state => ({
    agents: state.agents.map(agent => {
      if (agent.status === 'pending') return agent;

      let description = agent.description;
      switch (agent.name) {
        case 'Librarian':
          if (agent.status === 'completed' && chunks.length > 0) {
            description = `Retrieved ${chunks.length} chunks from ${uniquePapers} paper${uniquePapers !== 1 ? 's' : ''}`;
          } else if (agent.status === 'processing') {
            description = 'Searching arXiv for papers...';
          }
          break;
        case 'Analyst':
          if (agent.status === 'completed' && analyses.length > 0) {
            description = `Extracted ${analyses.length} methodolog${analyses.length !== 1 ? 'ies' : 'y'}`;
          } else if (agent.status === 'processing') {
            description = 'Extracting methodologies and equations...';
          }
          break;
        case 'Critic':
          if (agent.status === 'completed') {
            description = audits.length > 0
              ? `Audited ${audits.length} paper${audits.length !== 1 ? 's' : ''}`
              : 'Audit complete';
          } else if (agent.status === 'processing') {
            description = 'Auditing for biases and gaps...';
          }
          break;
        case 'Synthesizer':
          if (agent.status === 'completed' && synthesis) {
            description = 'Literature review compiled';
          } else if (agent.status === 'processing') {
            description = 'Compiling literature review...';
          }
          break;
      }
      return { ...agent, description };
    }),
  }));
}
