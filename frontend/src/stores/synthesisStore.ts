import { create } from 'zustand';
import type { SynthesisStatus, SynthesisResult, DepthLevel, LLMProvider } from '@/types';
import { startSynthesis as apiStartSynthesis, getSynthesisResult } from '@/services/api';
import { useAgentStore, feedTelemetryFromPoll } from '@/stores/agentStore';

interface SynthesisState {
  sessionId: string | null;
  status: SynthesisStatus;
  query: string;
  result: SynthesisResult | null;
  isLoading: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  startSynthesis: (depth?: DepthLevel, maxPapers?: number, provider?: LLMProvider) => Promise<void>;
  pollResult: () => Promise<void>;
  reset: () => void;
}

export const useSynthesisStore = create<SynthesisState>((set, get) => ({
  sessionId: null,
  status: 'idle',
  query: '',
  result: null,
  isLoading: false,
  error: null,

  setQuery: (query: string) => set({ query }),

  startSynthesis: async (depth = 'comprehensive', maxPapers = 5, provider = 'cloud' as LLMProvider) => {
    const { query } = get();
    if (!query.trim()) {
      set({ error: 'Please enter a research query' });
      return;
    }

    // Reset agent pipeline for the new run
    useAgentStore.getState().reset();

    set({ isLoading: true, error: null, status: 'processing', result: null });

    try {
      const response = await apiStartSynthesis({ query, depth, max_papers: maxPapers, provider });
      set({ sessionId: response.session_id, status: 'processing' });

      // Optimistically mark Librarian as processing
      useAgentStore.setState(state => ({
        agents: state.agents.map((a, idx) =>
          idx === 0
            ? { ...a, status: 'processing' as const, isActive: true, description: 'Searching arXiv for papers...' }
            : a
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start synthesis',
        isLoading: false,
        status: 'failed'
      });
    }
  },

  pollResult: async () => {
    const { sessionId, status } = get();
    if (!sessionId || status === 'completed' || status === 'failed') return;

    try {
      const result = await getSynthesisResult(sessionId);

      // Feed telemetry into agent store
      feedTelemetryFromPoll(result.telemetry || [], result);

      if (result.status === 'completed' || result.status === 'failed') {
        set({ result, status: result.status as SynthesisStatus, isLoading: false });
      } else {
        set({ result });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Polling failed',
        isLoading: false,
        status: 'failed'
      });
    }
  },

  reset: () => {
    useAgentStore.getState().reset();
    set({
      sessionId: null,
      status: 'idle',
      query: '',
      result: null,
      isLoading: false,
      error: null,
    });
  },
}));
