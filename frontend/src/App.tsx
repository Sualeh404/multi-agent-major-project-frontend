import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { SearchBar } from '@/components/SearchBar';
import { AgentPipeline } from '@/components/AgentPipeline';
import { SynthesisResult } from '@/components/SynthesisResult';
import { CitationPanel } from '@/components/CitationPanel';
import { TelemetryPanel } from '@/components/TelemetryPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { SourcesPanel } from '@/components/SourcesPanel';
import { HelpPanel } from '@/components/HelpPanel';
import { HomePage } from '@/components/HomePage';
import { TelemetryContent } from '@/components/TelemetryContent';
import { PaperApproval } from '@/components/PaperApproval';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { Toasts } from '@/components/Toasts';
import { Card, CardContent } from '@/components/ui/card';
import { notifyComplete, requestNotifyPermission, setTabTitle } from '@/utils/notify';
import { useRoute, getQueryParam, setQueryParam } from '@/utils/route';
import { upsertRecent } from '@/utils/history';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function MainContent() {
  const { status, pollResult, sessionId, query, restoreSession } = useSynthesisStore();
  const { activeTab } = useUIStore();
  const [prevStatus, setPrevStatus] = useState(status);

  // On mount: restore session from ?session=<id> if present
  useEffect(() => {
    const sid = getQueryParam('session');
    if (sid && sid !== sessionId) {
      void restoreSession(sid);
    }
    // run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror current sessionId into the URL so refresh restores it
  useEffect(() => {
    setQueryParam('session', sessionId);
  }, [sessionId]);

  // Persist completed/failed sessions to localStorage history
  useEffect(() => {
    if (!sessionId || !query) return;
    if (status === 'completed' || status === 'failed' || status === 'retrieval_failed') {
      upsertRecent({ sessionId, query, status, ts: Date.now() });
    }
  }, [sessionId, query, status]);

  useEffect(() => {
    if (!sessionId || (status !== 'processing' && status !== 'awaiting_approval')) return;

    // Exponential backoff: poll fast at first (so quick runs feel snappy),
    // then slow down. A 20-minute run at the old 2s interval = 600 polls;
    // this schedule keeps it under ~120.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = 1500;
    const maxDelay = 15000;

    const tick = async () => {
      if (cancelled) return;
      await pollResult();
      if (cancelled) return;
      delay = Math.min(Math.round(delay * 1.4), maxDelay);
      timer = setTimeout(tick, delay);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, status, pollResult]);

  // Tab title + system notification: nudge users who alt-tabbed during a
  // long run. Title shows live status; notification fires on completion
  // only when the tab is hidden (notify.ts guards that).
  useEffect(() => {
    if (status === 'processing') {
      setTabTitle(`Synthesizing… ${query?.slice(0, 40) || ''}`.trim());
      void requestNotifyPermission();
    } else if (status === 'completed' || status === 'failed' || status === 'retrieval_failed') {
      const label = status === 'completed' ? 'Ready' : 'Failed';
      setTabTitle(`${label}: ${query?.slice(0, 40) || ''}`.trim());
    } else if (status === 'awaiting_approval') {
      setTabTitle('Awaiting approval');
    } else {
      setTabTitle(null);
    }
    if (prevStatus === 'processing' && (status === 'completed' || status === 'failed' || status === 'retrieval_failed')) {
      notifyComplete(query || '', status === 'completed' ? 'completed' : 'failed');
    }
    setPrevStatus(status);
  }, [status, query, prevStatus]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {activeTab === 'result' && (
        <>
          <SearchBar />

          {status === 'awaiting_approval' && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <AgentPipeline />
                </CardContent>
              </Card>
              <PaperApproval />
            </>
          )}

          {status === 'processing' && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <AgentPipeline />
                </CardContent>
              </Card>
              <SynthesisResult />
            </>
          )}

          {status === 'completed' && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <AgentPipeline collapsible />
                </CardContent>
              </Card>
              <SynthesisResult />
            </>
          )}

          {status === 'retrieval_failed' && <SynthesisResult />}

          {(status === 'idle' || status === 'failed') && (
            <SynthesisResult />
          )}
        </>
      )}

      {activeTab === 'sources' && <SourcesPanel />}
      {activeTab === 'telemetry' && <TelemetryContent />}
      {activeTab === 'settings' && <SettingsPanel isTab />}
      {activeTab === 'help' && <HelpPanel />}

      <CitationPanel />
      <TelemetryPanel />
      <Toasts />
    </div>
  );
}

function RoutedRoot() {
  const [path] = useRoute();
  // /home → standalone marketing/landing page (no sidebar/header)
  // everything else → the synthesis app shell
  if (path === '/home') return <HomePage />;
  return (
    <AppShell>
      <MainContent />
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoutedRoot />
    </QueryClientProvider>
  );
}

export default App;
