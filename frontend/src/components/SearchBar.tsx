import { Search, ArrowRight, Loader2, Cloud, Sparkles, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { PdfUploadZone } from '@/components/PdfUploadZone';
import type { LLMProvider, Domain, Timeframe, FocusArea } from '@/types';

const DOMAINS: { id: Domain; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'cs', label: 'Computer Science' },
  { id: 'physics', label: 'Physics' },
  { id: 'math', label: 'Mathematics' },
  { id: 'bio', label: 'Biology' },
];

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: '1y', label: 'Last year' },
  { id: '3y', label: 'Last 3 years' },
  { id: '5y', label: 'Last 5 years' },
  { id: 'all', label: 'All time' },
];

const FOCUS_OPTIONS: { id: FocusArea; label: string }[] = [
  { id: 'methodology', label: 'Methodology' },
  { id: 'limitations', label: 'Limitations' },
  { id: 'math', label: 'Math / Proofs' },
];

export function SearchBar() {
  const { query, setQuery, startSynthesis, isLoading, status } = useSynthesisStore();
  const { settings, updateSettings } = useUIStore();
  const [inputFocused, setInputFocused] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const isProcessing = status === 'processing' || isLoading || status === 'awaiting_approval';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    await startSynthesis({
      depth: settings.depth,
      maxPapers: settings.max_papers,
      provider: settings.provider,
      domain: settings.domain,
      timeframe: settings.timeframe,
      focusAreas: settings.focus_areas,
      requireApproval,
      uploadId: uploadId || undefined,
    });
  };

  const toggleFocus = (id: FocusArea) => {
    const next = settings.focus_areas.includes(id)
      ? settings.focus_areas.filter((f) => f !== id)
      : [...settings.focus_areas, id];
    updateSettings({ focus_areas: next });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            'relative flex items-center rounded-xl border bg-card transition-all duration-200',
            inputFocused
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border'
          )}
        >
          <Search className="absolute left-4 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="Core question — e.g., How does semantic caching reduce RAG latency?"
            disabled={isProcessing}
            className="w-full pl-12 pr-4 py-4 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="pr-2">
            {isProcessing ? (
              <Button type="button" disabled size="default" className="gap-2 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </Button>
            ) : (
              <Button type="submit" size="default" className="gap-2 rounded-lg">
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Compact controls row */}
      <div className="flex items-center gap-3 mt-3 px-1 flex-wrap text-sm">
        <label className="flex items-center gap-2 text-muted-foreground">
          <span>Domain</span>
          <select
            value={settings.domain}
            onChange={(e) => updateSettings({ domain: e.target.value as Domain })}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </label>

        <label className="flex items-center gap-2 text-muted-foreground">
          <span>Timeframe</span>
          <select
            value={settings.timeframe}
            onChange={(e) => updateSettings({ timeframe: e.target.value as Timeframe })}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            {TIMEFRAMES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setRequireApproval((v) => !v)}
          disabled={isProcessing}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
            requireApproval
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
            isProcessing && 'opacity-50 cursor-not-allowed',
          )}
          title="Pause after Librarian to let me approve papers before analysis"
        >
          <UserCheck className="w-3.5 h-3.5" />
          Approve papers
        </button>

        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex items-center gap-1 ml-auto text-muted-foreground hover:text-foreground"
        >
          {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Advanced
        </button>

        <div className="flex items-center gap-1">
          {(['cloud', 'gemini'] as LLMProvider[]).map((p) => {
            const selected = settings.provider === p;
            const Icon = p === 'cloud' ? Cloud : Sparkles;
            return (
              <button
                key={p}
                type="button"
                disabled={isProcessing}
                onClick={() => updateSettings({ provider: p })}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                  selected
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                  isProcessing && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {p === 'cloud' ? 'Cloud' : 'Gemini'}
              </button>
            );
          })}
        </div>
      </div>

      <PdfUploadZone
        uploadId={uploadId}
        onUploaded={(id) => setUploadId(id)}
        onCleared={() => setUploadId(null)}
        disabled={isProcessing}
      />

      {/* Advanced options */}
      <AnimatePresence>
        {advancedOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-lg border border-border bg-card space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Focus area:</span>
                {FOCUS_OPTIONS.map((f) => {
                  const selected = settings.focus_areas.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => toggleFocus(f.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                        selected
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'text-muted-foreground border-border hover:bg-secondary',
                        isProcessing && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Max papers
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.max_papers}
                    onChange={(e) => updateSettings({ max_papers: parseInt(e.target.value) || 5 })}
                    disabled={isProcessing}
                    className="w-14 px-2 py-1 rounded-md bg-secondary text-secondary-foreground border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Depth
                  <select
                    value={settings.depth}
                    onChange={(e) => updateSettings({ depth: e.target.value as 'rapid' | 'comprehensive' })}
                    disabled={isProcessing}
                    className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground border-0"
                  >
                    <option value="rapid">Rapid</option>
                    <option value="comprehensive">Comprehensive</option>
                  </select>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
