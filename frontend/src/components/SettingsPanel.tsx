import { Settings as SettingsIcon, Sliders, RotateCcw, Zap, FileText, Gauge } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';

interface SettingsPanelProps {
  isTab?: boolean;
}

export function SettingsPanel({ isTab = false }: SettingsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const { settings, updateSettings, settingsOpen } = useUIStore();
  const { isLoading, status } = useSynthesisStore();

  if (!isTab && !settingsOpen) return null;

  const isProcessing = status === 'processing' || isLoading;

  return (
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-80"
        >
          <Card variant="elevated">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-accent" />
                <span className="font-medium text-foreground">Settings</span>
              </div>
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Zap className="w-4 h-4" />
                      <span>Cognitive Depth</span>
                    </label>
                    <select
                      value={settings.depth}
                      onChange={(e) => updateSettings({ depth: e.target.value as 'rapid' | 'comprehensive' })}
                      disabled={isProcessing}
                      className="w-full h-10 px-3 rounded-lg bg-gray-50 border border-gray-200"
                    >
                      <option value="rapid">Rapid (Quick synthesis)</option>
                      <option value="comprehensive">Comprehensive (Detailed)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>Max Papers: {settings.max_papers}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={settings.max_papers}
                      onChange={(e) => updateSettings({ max_papers: parseInt(e.target.value) })}
                      disabled={isProcessing}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RotateCcw className="w-4 h-4" />
                      <span>Revision Limit: {settings.revision_limit}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={3}
                      value={settings.revision_limit}
                      onChange={(e) => updateSettings({ revision_limit: parseInt(e.target.value) })}
                      disabled={isProcessing}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-muted-foreground mb-2">Quick Presets</p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateSettings({ depth: 'rapid', max_papers: 2 })}
                        disabled={isProcessing}
                      >
                        <Zap className="w-4 h-4 mr-1" />
                        Rapid
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateSettings({ depth: 'comprehensive', max_papers: 5 })}
                        disabled={isProcessing}
                      >
                        <Gauge className="w-4 h-4 mr-1" />
                        Deep
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
