import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { Card, CardContent } from '@/components/ui/card';
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
              'bg-secondary text-primary hover:bg-primary hover:text-primary-foreground',
              'transition-colors duration-200',
              selectedCitation === String(num) && 'bg-primary text-primary-foreground'
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
      <Card className="text-center">
        <CardContent className="py-16 space-y-3">
          <p className="text-lg text-muted-foreground">Enter a research query above</p>
          <p className="text-sm text-muted-foreground">
            e.g., "What are the latest advances in quantum computing?"
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'processing' || status === 'completed') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-foreground">Synthesis</h2>
              {result?.cost_inr != null && (
                <Badge variant="secondary">₹{result.cost_inr.toFixed(2)}</Badge>
              )}
            </div>

            {result?.synthesis ? (
              <div className="mt-4 text-sm leading-relaxed text-foreground">
                {renderedContent}
              </div>
            ) : (
              <div className="mt-6 space-y-2.5">
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="h-4 bg-muted rounded animate-pulse w-full" />
                <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'failed') {
    return (
      <Card className="text-center">
        <CardContent className="py-16 space-y-2">
          <p className="text-destructive text-lg">Something went wrong</p>
          <p className="text-sm text-muted-foreground">Please try again</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
