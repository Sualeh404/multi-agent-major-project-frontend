import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { useToastStore } from '@/stores/toastStore';
import { runDeepAudit } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { ComparisonTable } from '@/components/ComparisonTable';
import { ExportMenu } from '@/components/ExportMenu';
import type { ConfidenceLevel } from '@/types';

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; color: string; tooltip: string }> = {
  high: {
    label: 'High Confidence',
    color: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
    tooltip: 'All papers passed the Critic\'s audit; methodologies align.',
  },
  moderate: {
    label: 'Moderate Confidence',
    color: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    tooltip: 'Some papers raised concerns or required revision; review carefully.',
  },
  low: {
    label: 'Low Confidence',
    color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    tooltip: 'Circuit breaker tripped — little consensus found in the literature.',
  },
};

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const cfg = CONFIDENCE_CONFIG[level];
  return (
    <span
      title={cfg.tooltip}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        cfg.color,
      )}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export function SynthesisResult() {
  const { result, status, query, sessionId, error } = useSynthesisStore();
  const { selectedCitation, setSelectedCitation } = useUIStore();
  const addToast = useToastStore((s) => s.addToast);
  const [auditing, setAuditing] = useState(false);

  // Citation chip: turns the literal "[3]" text into a clickable badge that
  // selects the matching source in the citation panel. Used as a text-node
  // transformer inside react-markdown so headings, bullets, tables, bold
  // etc. all render properly while [n] markers stay interactive.
  const renderCitationsInText = (text: string): ReactNode[] => {
    const parts = text.split(/\[(\d+)\]/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        const num = parseInt(part, 10);
        return (
          <button
            key={`citation-${index}-${num}`}
            onClick={() => setSelectedCitation(String(num))}
            className={cn(
              'font-mono text-xs px-1.5 py-0.5 rounded mx-0.5 align-baseline',
              'bg-secondary text-primary hover:bg-primary hover:text-primary-foreground',
              'transition-colors duration-200',
              selectedCitation === String(num) && 'bg-primary text-primary-foreground',
            )}
          >
            [{num}]
          </button>
        );
      }
      return <Fragment key={`text-${index}`}>{part}</Fragment>;
    });
  };

  const transformChildren = (children: ReactNode): ReactNode => {
    if (typeof children === 'string') return renderCitationsInText(children);
    if (Array.isArray(children)) {
      return children.map((child, i) =>
        typeof child === 'string' ? (
          <Fragment key={`c-${i}`}>{renderCitationsInText(child)}</Fragment>
        ) : (
          <Fragment key={`c-${i}`}>{child}</Fragment>
        ),
      );
    }
    return children;
  };

  const renderedContent = useMemo(() => {
    if (!result?.synthesis) return null;
    // react-markdown's `components` props are loosely typed (HTML attrs +
    // children). We narrow to {children, href?} locally to avoid implicit
    // any while still letting react-markdown pass the other HTML props.
    type MdProps = { children?: ReactNode; href?: string };
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }: MdProps) => (
            <h1 className="text-2xl font-semibold mt-6 mb-3 text-foreground">{transformChildren(children)}</h1>
          ),
          h2: ({ children }: MdProps) => (
            <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground">{transformChildren(children)}</h2>
          ),
          h3: ({ children }: MdProps) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{transformChildren(children)}</h3>
          ),
          p: ({ children }: MdProps) => (
            <p className="my-2 leading-relaxed text-foreground">{transformChildren(children)}</p>
          ),
          ul: ({ children }: MdProps) => <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>,
          ol: ({ children }: MdProps) => <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>,
          li: ({ children }: MdProps) => <li className="leading-relaxed">{transformChildren(children)}</li>,
          strong: ({ children }: MdProps) => <strong className="font-semibold">{transformChildren(children)}</strong>,
          em: ({ children }: MdProps) => <em className="italic">{transformChildren(children)}</em>,
          code: ({ children }: MdProps) => (
            <code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{children}</code>
          ),
          pre: ({ children }: MdProps) => (
            <pre className="font-mono text-xs bg-secondary p-3 rounded overflow-x-auto my-2">{children}</pre>
          ),
          a: ({ children, href }: MdProps) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          table: ({ children }: MdProps) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-sm border border-border">{children}</table>
            </div>
          ),
          th: ({ children }: MdProps) => (
            <th className="border border-border px-2 py-1 bg-secondary text-left font-semibold">{children}</th>
          ),
          td: ({ children }: MdProps) => <td className="border border-border px-2 py-1">{transformChildren(children)}</td>,
        }}
      >
        {result.synthesis}
      </ReactMarkdown>
    );
    // transformChildren / renderCitationsInText close over selectedCitation
    // so we depend on it explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.synthesis, selectedCitation, setSelectedCitation]);

  const handleDeepAudit = async () => {
    if (!sessionId) return;
    setAuditing(true);
    try {
      const res = await runDeepAudit(sessionId);
      const f = res.metrics?.faithfulness;
      const r = res.metrics?.answer_relevancy;
      if (f != null || r != null) {
        addToast(
          `Audit: faithfulness ${(f ?? 0).toFixed(2)}, relevancy ${(r ?? 0).toFixed(2)}`,
          'success',
        );
      } else {
        addToast('Deep audit complete (RAGAS unavailable in environment)', 'info');
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Audit failed', 'error');
    } finally {
      setAuditing(false);
    }
  };

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {status === 'completed' && result?.comparison_table && result.comparison_table.length > 0 && (
          <ComparisonTable rows={result.comparison_table} />
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Synthesis</h2>
                {status === 'completed' && result?.confidence && (
                  <ConfidenceBadge level={result.confidence} />
                )}
              </div>
              <div className="flex items-center gap-2">
                {result?.cost_inr != null && (
                  <Badge variant="secondary">₹{result.cost_inr.toFixed(2)}</Badge>
                )}
                {status === 'completed' && result?.synthesis && sessionId && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeepAudit}
                      disabled={auditing}
                      className="gap-1.5 text-muted-foreground"
                      title="Run RAGAS faithfulness/relevancy evaluation (extra cost)"
                    >
                      {auditing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Deep Audit</span>
                    </Button>
                    <ExportMenu sessionId={sessionId} />
                  </>
                )}
              </div>
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
          <p className="text-sm text-muted-foreground">
            {error || 'An unexpected error occurred. Please try again.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
