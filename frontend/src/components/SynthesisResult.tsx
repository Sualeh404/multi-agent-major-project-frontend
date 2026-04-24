import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

export function SynthesisResult() {
  const { result, status, query } = useSynthesisStore();
  const { selectedCitation, setSelectedCitation } = useUIStore();

  const renderedContent = useMemo(() => {
    if (!result?.synthesis) return null;

    const parts = result.synthesis.split(/\[(\d+)\]/g);
    
    return parts.map((part, index) => {
      const num = parseInt(part);
      if (!isNaN(num)) {
        return (
          <button
            key={`citation-${index}`}
            onClick={() => setSelectedCitation(String(num))}
            className={cn(
              'font-mono text-sm px-1.5 py-0.5 rounded',
              'bg-gray-100 text-accent hover:bg-accent hover:text-white',
              'transition-colors duration-200',
              selectedCitation === String(num) && 'bg-accent text-white'
            )}
          >
            [{num}]
          </button>
        );
      }
      return <span key={`text-${index}`}>{part}</span>;
    });
  }, [result?.synthesis, selectedCitation, setSelectedCitation]);

  if (status === 'idle' || !query) {
    return (
      <Card variant="elevated" className="text-center py-16">
        <div className="space-y-4">
          <p className="text-xl text-muted-foreground">Enter a research query above</p>
          <p className="text-sm text-muted-foreground">
            e.g., "What are the latest advances in quantum computing?"
          </p>
        </div>
      </Card>
    );
  }

  if (status === 'processing' || status === 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <Card variant="elevated">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-semibold text-foreground">Synthesis</h2>
            {result?.cost_inr && (
              <Badge variant="success">₹{result.cost_inr.toFixed(2)}</Badge>
            )}
          </div>
          
          {result?.synthesis ? (
            <div className="mt-4 prose prose-sm max-w-none">
              {renderedContent}
            </div>
          ) : (
            <div className="mt-8 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            </div>
          )}
        </Card>
      </motion.div>
    );
  }

  if (status === 'failed') {
    return (
      <Card variant="elevated" className="text-center py-16">
        <p className="text-destructive text-lg">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-2">Please try again</p>
      </Card>
    );
  }

  return null;
}
