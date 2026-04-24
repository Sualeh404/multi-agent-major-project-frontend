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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { activeTab, setActiveTab } = useUIStore();

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Search & Agent Pipeline */}
      <div className="lg:col-span-1 space-y-6">
        <SearchBar />
        
        {status === 'processing' ? (
          <Card>
            <CardContent className="pt-6">
              <AgentPipelineSkeleton />
            </CardContent>
          </Card>
        ) : status === 'completed' ? (
          <Card>
            <CardContent className="pt-6">
              <AgentPipeline />
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Right Column - Tab Content */}
      <div className="lg:col-span-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="result">Synthesis</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>

          <TabsContent value="result">
            {status === 'processing' ? (
              <SynthesisSkeleton />
            ) : (
              <SynthesisResult />
            )}
          </TabsContent>

          <TabsContent value="sources">
            <SourcesPanel />
          </TabsContent>

          <TabsContent value="telemetry">
            <TelemetryContent />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPanel isTab={true} />
          </TabsContent>

          <TabsContent value="help">
            <HelpPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Panels */}
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