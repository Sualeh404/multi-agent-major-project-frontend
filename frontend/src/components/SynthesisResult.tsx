import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useUIStore } from '@/stores/uiStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { ComparisonTable } from '@/components/ComparisonTable';
import { ExportMenu } from '@/components/ExportMenu';
import { CriticAudits } from '@/components/CriticAudits';
import { OutlineNav } from '@/components/OutlineNav';
import { ConnectionsGraph } from '@/components/ConnectionsGraph';
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

const EXAMPLE_QUERIES = [
  'What are the latest advances in quantum error correction?',
  'How does RLHF compare to DPO for aligning LLMs?',
  'Recent progress on diffusion models for protein folding',
  'Sparse attention mechanisms in long-context transformers',
];

function EmptyState() {
  const { setQuery, startSynthesis } = useSynthesisStore();
  const { settings } = useUIStore();
  return (
    <Card>
      <CardContent className="py-12 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Active literature synthesis</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Multi-agent reviews of recent papers, validated by adversarial critics and traced to source.
            Expect ~1–3 minutes per query.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
            Try an example
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  // Fire immediately so the user can watch it run; they can
                  // always click Reset and re-tune from settings.
                  void startSynthesis({
                    depth: settings.depth,
                    maxPapers: settings.max_papers,
                    provider: settings.provider,
                    domain: settings.domain,
                    timeframe: settings.timeframe,
                    focusAreas: settings.focus_areas,
                  });
                }}
                className="text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceBadge({ level, reason }: { level: ConfidenceLevel; reason?: string | null }) {
  const cfg = CONFIDENCE_CONFIG[level];
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={cfg.tooltip}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium hover:opacity-90',
          cfg.color,
        )}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        {cfg.label}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-30 w-72 p-3 rounded-md border border-border bg-card shadow-lg text-xs leading-relaxed text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-semibold mb-1.5">{cfg.label}</p>
          <p className="text-muted-foreground">{reason || cfg.tooltip}</p>
        </div>
      )}
    </span>
  );
}

function deriveConfidenceReason(result: NonNullable<ReturnType<typeof useSynthesisStore.getState>['result']>): string {
  const papers = result.papers?.length ?? 0;
  const audits = result.audits ?? [];
  if (papers === 0) return 'No papers retrieved — upstream APIs (arXiv / Semantic Scholar) may be rate-limited.';
  const rejects = audits.filter((a) => a.verdict === 'reject').length;
  const personas = new Set<string>();
  for (const a of audits) {
    for (const flag of [...(a.identified_biases || []), ...(a.methodology_flaws || [])]) {
      const m = flag.match(/^\[(\w+)\]/);
      if (m) personas.add(m[1]);
    }
  }
  if (rejects > 0) {
    return `Critic flagged ${rejects} audit${rejects > 1 ? 's' : ''} as reject${personas.size ? ` (personas: ${Array.from(personas).join(', ')})` : ''}.`;
  }
  return 'All audits passed; sources cleanly aligned.';
}

export function SynthesisResult() {
  const { result, status, query, sessionId, error } = useSynthesisStore();
  const { selectedCitation, setSelectedCitation } = useUIStore();

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

  if (status === 'idle' || !query) {
    return <EmptyState />;
  }

  if (status === 'cancelled') {
    return <CancelledOrFailedState
      heading="Run cancelled"
      message="You cancelled this synthesis. Token usage may have continued for a few seconds while the agent finished its current step."
      tone="muted"
    />;
  }

  if (status === 'processing' || status === 'completed' || status === 'retrieval_failed') {
    const paperCount = result?.papers?.length ?? 0;
    const chunkCount = result?.chunks?.length ?? 0;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Stream early: as soon as the Librarian returns we have papers
            to show — no reason to wait for the Synthesizer to finish. */}
        {status === 'processing' && paperCount > 0 && (
          <Card>
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Papers retrieved</p>
                <Badge variant="secondary">{paperCount}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {chunkCount} chunks extracted. Open the Sources tab for full text.
              </p>
              <ul className="text-sm space-y-1 mt-2">
                {result?.papers?.slice(0, 5).map((p, i) => (
                  <li key={p.paper_id} className="text-foreground/80">
                    <span className="font-mono text-xs text-muted-foreground mr-2">[{i + 1}]</span>
                    {p.title || p.paper_id}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
        {result?.comparison_table && result.comparison_table.length > 0 && (
          <ComparisonTable rows={result.comparison_table} />
        )}
        {status === 'completed' && result?.audits && result.audits.length > 0 && (
          <CriticAudits audits={result.audits} />
        )}
        {status === 'completed' && (result?.papers?.length || 0) >= 2 && <ConnectionsGraph />}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">Synthesis</h2>
                {status === 'completed' && result?.confidence && (
                  <ConfidenceBadge
                    level={result.confidence}
                    reason={result ? deriveConfidenceReason(result) : null}
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                {result?.cost_inr != null && (
                  <Badge variant="secondary">₹{result.cost_inr.toFixed(2)}</Badge>
                )}
                {status === 'completed' && result?.synthesis && sessionId && (
                  <ExportMenu sessionId={sessionId} />
                )}
              </div>
            </div>

            {result?.synthesis ? (
              <div className="mt-4 flex gap-6">
                <div className="flex-1 min-w-0 synthesis-essay text-sm leading-relaxed text-foreground">
                  {renderedContent}
                </div>
                {status === 'completed' && (
                  <OutlineNav outline={result.outline || []} synthesis={result.synthesis} />
                )}
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
    return <CancelledOrFailedState
      heading="Something went wrong"
      message={error || 'An unexpected error occurred. Please try again.'}
      tone="destructive"
    />;
  }

  return null;
}

function CancelledOrFailedState({
  heading, message, tone,
}: { heading: string; message: string; tone: 'muted' | 'destructive' }) {
  const reset = useSynthesisStore((s) => s.reset);
  return (
    <Card className="text-center">
      <CardContent className="py-16 space-y-3">
        <p className={tone === 'destructive' ? 'text-destructive text-lg' : 'text-foreground text-lg'}>
          {heading}
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
        <div className="pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            New query
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
