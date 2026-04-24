import { create } from 'zustand';
import type { SynthesisStatus, SynthesisResult, DepthLevel } from '@/types';
import { startSynthesis as apiStartSynthesis, pollSynthesisResult } from '@/services/api';

interface SynthesisState {
  sessionId: string | null;
  status: SynthesisStatus;
  query: string;
  result: SynthesisResult | null;
  isLoading: boolean;
  error: string | null;
  
  setQuery: (query: string) => void;
  startSynthesis: (depth?: DepthLevel, maxPapers?: number) => Promise<void>;
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

  startSynthesis: async (depth = 'comprehensive', maxPapers = 5) => {
    const { query } = get();
    if (!query.trim()) {
      set({ error: 'Please enter a research query' });
      return;
    }

    set({ isLoading: true, error: null, status: 'processing' });

    try {
      const response = await apiStartSynthesis({ query, depth, max_papers: maxPapers });
      set({ sessionId: response.session_id, status: 'processing' });
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
      const result = await pollSynthesisResult(sessionId, (progress) => {
        set({ result: progress });
      });
      set({ result, status: result.status as SynthesisStatus, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Polling failed',
        isLoading: false,
        status: 'failed'
      });
    }
  },

  reset: () => set({
    sessionId: null,
    status: 'idle',
    query: '',
    result: null,
    isLoading: false,
    error: null,
  }),
}));