import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Zap, FileText, Gauge, Cloud, Sparkles, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUIStore, loadStoredApiKey, saveStoredApiKey } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useToastStore } from '@/stores/toastStore';
import type { LLMProvider } from '@/types';
import { cn } from '@/utils/cn';

interface SettingsPanelProps {
  isTab?: boolean;
}

const PROVIDERS: { id: LLMProvider; label: string; description: string; icon: typeof Cloud }[] = [
  {
    id: 'cloud',
    label: 'Groq (fast)',
    description: 'Groq Llama 3 with Cerebras fallback — fastest option',
    icon: Cloud,
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    description: 'Google Gemini 2.0 Flash — slower but higher quality',
    icon: Sparkles,
  },
];

export function SettingsPanel({ isTab = false }: SettingsPanelProps) {
  const { settings, updateSettings, settingsOpen } = useUIStore();
  const { isLoading, status } = useSynthesisStore();
  const addToast = useToastStore((s) => s.addToast);
  const [apiKey, setApiKey] = useState('');
  const [keyDraft, setKeyDraft] = useState('');

  useEffect(() => {
    const k = loadStoredApiKey();
    setApiKey(k);
    setKeyDraft(k);
  }, []);

  if (!isTab && !settingsOpen) return null;

  const isProcessing = status === 'processing' || isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Settings
        </CardTitle>
        <CardDescription>
          Configure synthesis parameters and LLM provider
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LLM Provider */}
        <div className="space-y-3">
          <label className="text-sm font-medium">LLM Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              const selected = settings.provider === p.id;
              return (
                <button
                  key={p.id}
                  disabled={isProcessing}
                  onClick={() => updateSettings({ provider: p.id })}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', selected ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', selected ? 'text-foreground' : 'text-muted-foreground')}>
                      {p.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground leading-snug">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Cognitive Depth */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Zap className="w-4 h-4 text-muted-foreground" />
            Cognitive Depth
          </label>
          <select
            value={settings.depth}
            onChange={(e) => updateSettings({ depth: e.target.value as 'rapid' | 'comprehensive' })}
            disabled={isProcessing}
            className="w-full h-10 px-3 rounded-lg bg-secondary text-secondary-foreground border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            <option value="rapid">Rapid (Quick synthesis)</option>
            <option value="comprehensive">Comprehensive (Detailed)</option>
          </select>
        </div>

        {/* Max Papers */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Max Papers: {settings.max_papers}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={settings.max_papers}
            onChange={(e) => updateSettings({ max_papers: parseInt(e.target.value) })}
            disabled={isProcessing}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        <Separator />

        {/* API key (only relevant when backend has APP_SECRET_KEY set) */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Key className="w-4 h-4 text-muted-foreground" />
            API key
          </label>
          <p className="text-xs text-muted-foreground">
            Required only if your backend is protected with <code className="font-mono">APP_SECRET_KEY</code>.
            Stored in your browser's localStorage; never sent anywhere except as the <code className="font-mono">x-api-key</code> header.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={apiKey ? '••••••••' : 'paste key…'}
              className="flex-1 h-9 px-3 rounded-md bg-secondary text-secondary-foreground border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none text-sm"
              autoComplete="off"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                saveStoredApiKey(keyDraft.trim());
                setApiKey(keyDraft.trim());
                addToast(keyDraft.trim() ? 'API key saved' : 'API key cleared', 'success');
              }}
            >
              Save
            </Button>
            {apiKey && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  saveStoredApiKey('');
                  setApiKey('');
                  setKeyDraft('');
                  addToast('API key cleared', 'info');
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Quick Presets */}
        <div>
          <p className="text-sm font-medium mb-3">Quick Presets</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateSettings({ depth: 'rapid', max_papers: 2 })}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Rapid
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => updateSettings({ depth: 'comprehensive', max_papers: 5 })}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <Gauge className="w-4 h-4" />
              Comprehensive
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
