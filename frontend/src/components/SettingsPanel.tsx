import { Settings as SettingsIcon, RotateCcw, Zap, FileText, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';

interface SettingsPanelProps {
  isTab?: boolean;
}

export function SettingsPanel({ isTab = false }: SettingsPanelProps) {
  const { settings, updateSettings, settingsOpen } = useUIStore();
  const { isLoading, status } = useSynthesisStore();

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
          Configure synthesis parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            Revision Limit: {settings.revision_limit}
          </label>
          <input
            type="range"
            min={1}
            max={3}
            value={settings.revision_limit}
            onChange={(e) => updateSettings({ revision_limit: parseInt(e.target.value) })}
            disabled={isProcessing}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>3</span>
          </div>
        </div>

        <Separator />

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
