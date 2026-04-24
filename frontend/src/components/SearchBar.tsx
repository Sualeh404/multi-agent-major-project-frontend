import { Search, ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { motion } from 'framer-motion';

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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            relative flex items-center bg-white rounded-2xl border-2 transition-all duration-300
            ${inputFocused ? 'border-accent shadow-apple-lg scale-[1.02]' : 'border-gray-200 shadow-apple'}
          `}
        >
          <Search className="absolute left-5 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="What would you like to research?"
            disabled={isProcessing}
            className={`
              w-full px-14 py-5 bg-transparent text-lg text-foreground
              placeholder:text-muted-foreground focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          <div className="pr-3">
            {isProcessing ? (
              <Button type="button" disabled size="lg" className="gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </Button>
            ) : (
              <Button type="submit" size="lg" className="gap-2">
                <span>Analyze</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
        <span>Depth:</span>
        <select
          value={settings.depth}
          onChange={(e) => updateSettings({ depth: e.target.value as 'rapid' | 'comprehensive' })}
          disabled={isProcessing}
          className="px-3 py-1.5 rounded-lg bg-muted border border-gray-200"
        >
          <option value="rapid">Rapid (2 papers)</option>
          <option value="comprehensive">Comprehensive (5 papers)</option>
        </select>
        <span>Max Papers:</span>
        <input
          type="number"
          min={1}
          max={10}
          value={settings.max_papers}
          onChange={(e) => updateSettings({ max_papers: parseInt(e.target.value) || 5 })}
          disabled={isProcessing}
          className="w-16 px-3 py-1.5 rounded-lg bg-muted border border-gray-200"
        />
      </div>
    </motion.div>
  );
}
