import { create } from 'zustand';
import type { SynthesisStatus, SynthesisResult, DepthLevel, LLMProvider, Domain, Timeframe, FocusArea } from '@/types';
import { startSynthesis as apiStartSynthesis, getSynthesisResult, approvePapers as apiApprovePapers, cancelSynthesis as apiCancel } from '@/services/api';
import { useAgentStore, feedTelemetryFromPoll, feedWSEvent } from '@/stores/agentStore';
import { useToastStore } from '@/stores/toastStore';
import { wsService, type WSEvent } from '@/services/websocket';

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
    requireApproval?: boolean;
    uploadId?: string;
  }) => Promise<void>;
  approveSelectedPapers: (paperIds: string[]) => Promise<void>;
  pollResult: () => Promise<void>;
  restoreSession: (sessionId: string) => Promise<void>;
  cancel: () => Promise<void>;
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
    const requireApproval = opts.requireApproval ?? false;
    const uploadId = opts.uploadId ?? '';

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
        require_approval: requireApproval,
        upload_id: uploadId,
      });
      const initialStatus = (response.status as SynthesisStatus) || 'processing';
      set({ sessionId: response.session_id, status: initialStatus });

      // Open the WebSocket so we get live per-node updates and don't
      // have to wait for HTTP polling to discover state transitions.
      // The poll loop is still active as a fallback.
      wsService.connect(
        response.session_id,
        (ev: WSEvent) => {
          feedWSEvent(ev);
          if (ev.type === 'done') {
            // Force one final poll to refresh result fields fully
            void get().pollResult();
          }
        },
        () => {/* status changes — could surface in UI later */},
      );

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
    if (!sessionId) return;
    if (status === 'completed' || status === 'failed') return;

    try {
      const result = await getSynthesisResult(sessionId);
      feedTelemetryFromPoll(result.telemetry || [], result);

      const newStatus = result.status as SynthesisStatus;
      if (newStatus === 'completed' || newStatus === 'failed') {
        set({ result, status: newStatus, isLoading: false });
      } else {
        // 'processing' or 'awaiting_approval' — keep result fresh
        set({ result, status: newStatus });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Polling failed';
      set({ error: msg, isLoading: false, status: 'failed' });
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  restoreSession: async (sid: string) => {
    // Fetch a previously-running session by id (URL restore on refresh).
    // If the backend has expired the session (TTL 1h) we silently no-op.
    try {
      const result = await getSynthesisResult(sid);
      const newStatus = result.status as SynthesisStatus;
      set({
        sessionId: sid,
        status: newStatus,
        query: result.synthesis ? get().query || '' : get().query,
        result,
        isLoading: false,
        error: null,
      });
    } catch {
      /* expired or missing — stay on idle */
    }
  },

  approveSelectedPapers: async (paperIds) => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      await apiApprovePapers(sessionId, paperIds);
      set({ status: 'processing' });
      useToastStore.getState().addToast(`Approved ${paperIds.length} papers`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Approval failed';
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  cancel: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      await apiCancel(sessionId);
      set({ status: 'cancelled', isLoading: false });
      useToastStore.getState().addToast('Synthesis cancelled', 'info');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancel failed';
      useToastStore.getState().addToast(msg, 'error');
    }
  },

  reset: () => {
    wsService.disconnect();
    useAgentStore.getState().reset();
    try {
      // Drop ?session= from the URL so a refresh starts clean.
      const params = new URLSearchParams(window.location.search);
      params.delete('session');
      const search = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (search ? `?${search}` : ''));
    } catch {/* ignore */}
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
