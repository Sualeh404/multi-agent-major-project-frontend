import { create } from 'zustand';
import type { SynthesisStatus, SynthesisResult, DepthLevel, LLMProvider, Domain, Timeframe, FocusArea } from '@/types';
import { startSynthesis as apiStartSynthesis, getSynthesisResult } from '@/services/api';
import { useAgentStore, feedTelemetryFromPoll } from '@/stores/agentStore';
import { useToastStore } from '@/stores/toastStore';

interface SynthesisState {
  sessionId: string | null;
  status: SynthesisStatus;
  query: string;
  result: SynthesisResult | null;
  isLoading: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  startSynthesis: (opts: {
    depth?: DepthLevel;
    maxPapers?: number;
    provider?: LLMProvider;
    domain?: Domain;
    timeframe?: Timeframe;
    focusAreas?: FocusArea[];
  }) => Promise<void>;
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

  startSynthesis: async (opts) => {
    const { query } = get();
    if (!query.trim()) {
      set({ error: 'Please enter a research query' });
      return;
    }

    const depth = opts.depth ?? 'comprehensive';
    const maxPapers = opts.maxPapers ?? 5;
    const provider = opts.provider ?? 'cloud';
    const domain = opts.domain ?? 'any';
    const timeframe = opts.timeframe ?? 'all';
    const focusAreas = opts.focusAreas ?? [];

    // Reset agent pipeline for the new run
    useAgentStore.getState().reset();

    set({ isLoading: true, error: null, status: 'processing', result: null });

    try {
      const response = await apiStartSynthesis({
        query,
        depth,
        max_papers: maxPapers,
        provider,
        domain,
        timeframe,
        focus_areas: focusAreas,
      });
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
      const msg = error instanceof Error ? error.message : 'Failed to start synthesis';
      set({ error: msg, isLoading: false, status: 'failed' });
      useToastStore.getState().addToast(msg, 'error');
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
      const msg = error instanceof Error ? error.message : 'Polling failed';
      set({ error: msg, isLoading: false, status: 'failed' });
      useToastStore.getState().addToast(msg, 'error');
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
