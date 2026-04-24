import { useEffect } from 'react';
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
import { TelemetryContent } from '@/components/TelemetryContent';
import { SynthesisSkeleton, AgentPipelineSkeleton } from '@/components/LoadingStates';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { Card, CardContent } from '@/components/ui/card';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function MainContent() {
  const { status, pollResult, sessionId } = useSynthesisStore();
  const { activeTab } = useUIStore();

  useEffect(() => {
    if (sessionId && status === 'processing') {
      pollResult();
      const interval = setInterval(() => {
        pollResult();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [sessionId, status, pollResult]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {activeTab === 'result' && (
        <>
          <SearchBar />

          {status === 'processing' ? (
            <>
              <SynthesisSkeleton />
              <Card>
                <CardContent className="pt-6">
                  <AgentPipelineSkeleton />
                </CardContent>
              </Card>
            </>
          ) : status === 'completed' ? (
            <>
              <SynthesisResult />
              <Card>
                <CardContent className="pt-6">
                  <AgentPipeline />
                </CardContent>
              </Card>
            </>
          ) : (
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
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <MainContent />
      </AppShell>
    </QueryClientProvider>
  );
}

export default App;
