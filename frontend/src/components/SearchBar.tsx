import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

export function SearchBar() {
  const { query, setQuery, startSynthesis, isLoading, status } = useSynthesisStore();
  const { settings, updateSettings } = useUIStore();
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    await startSynthesis(settings.depth, settings.max_papers);
  };

  const isProcessing = status === 'processing' || isLoading;

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
            placeholder="What would you like to research?"
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

      <div className="flex items-center gap-4 mt-3 px-1">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Depth</span>
          <select
            value={settings.depth}
            onChange={(e) => updateSettings({ depth: e.target.value as 'rapid' | 'comprehensive' })}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-sm border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            <option value="rapid">Rapid (2 papers)</option>
            <option value="comprehensive">Comprehensive (5 papers)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Max Papers</span>
          <input
            type="number"
            min={1}
            max={10}
            value={settings.max_papers}
            onChange={(e) => updateSettings({ max_papers: parseInt(e.target.value) || 5 })}
            disabled={isProcessing}
            className="w-14 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </label>
      </div>
    </motion.div>
  );
}
