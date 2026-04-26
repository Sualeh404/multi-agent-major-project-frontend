import { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useToastStore } from '@/stores/toastStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getArxivUrl } from '@/utils/arxiv';
import { getCitations } from '@/services/api';
import type { CitationFormat, PaperCitation } from '@/types';
import { cn } from '@/utils/cn';

const FORMAT_LABELS: Record<CitationFormat, string> = {
  apa: 'APA',
  mla: 'MLA',
  ieee: 'IEEE',
  chicago: 'Chicago',
};

export function CitationPanel() {
  const { selectedCitation, setSelectedCitation, setSelectedChunk } = useUIStore();
  const { result, sessionId } = useSynthesisStore();
  const addToast = useToastStore((s) => s.addToast);
  const [citations, setCitations] = useState<PaperCitation[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedCitation(null);
    setSelectedChunk(null);
  };

  // Close on Escape key
  useEffect(() => {
    if (!selectedCitation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCitation]);

  // Fetch citations when panel opens (lazy, once per session)
  useEffect(() => {
    if (!selectedCitation || !sessionId || citations) return;
    getCitations(sessionId)
      .then((res) => setCitations(res.citations))
      .catch(() => {/* silent */});
  }, [selectedCitation, sessionId, citations]);

  const citationNumber = selectedCitation ? parseInt(selectedCitation) : null;
  const chunk = result?.chunks?.[(citationNumber ?? 1) - 1];
  const paper = chunk ? result?.papers?.find((p) => p.paper_id === chunk.paper_id) : null;
  const paperCitation = chunk ? citations?.find((c) => c.paper_id === chunk.paper_id) : null;

  // Find the sentence in the synthesis that contains [n], for traceability
  const citedSentence = (() => {
    if (!result?.synthesis || citationNumber == null) return null;
    const marker = `[${citationNumber}]`;
    const idx = result.synthesis.indexOf(marker);
    if (idx === -1) return null;
    // Expand to the sentence around the marker (between previous and next sentence-end)
    const before = result.synthesis.slice(0, idx);
    const after = result.synthesis.slice(idx);
    const startMatch = before.match(/[.!?\n][^.!?\n]*$/);
    const start = startMatch ? before.length - (startMatch[0].length - 1) : 0;
    const endMatch = after.match(/[.!?\n]/);
    const end = endMatch ? idx + (endMatch.index ?? after.length) + 1 : result.synthesis.length;
    return result.synthesis.slice(start, end).trim();
  })();

  // Highlight overlap: split citedSentence into content words (>=4 chars), find them in chunk text
  const highlightedChunk = (() => {
    if (!chunk || !citedSentence) return chunk?.text ?? '';
    const stop = new Set(['that', 'this', 'with', 'from', 'they', 'them', 'their', 'have', 'been', 'were', 'which', 'where', 'when', 'what', 'such', 'these', 'those', 'into', 'than', 'also', 'only', 'about', 'while', 'using']);
    const tokens = Array.from(new Set(
      citedSentence
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stop.has(w))
    ));
    if (tokens.length === 0) return chunk.text;
    // Build a regex that matches any token (word-boundary, case-insensitive)
    const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    return chunk.text.replace(re, '\u0000$1\u0000');
  })();

  const renderHighlighted = (text: string) => {
    return text.split('\u0000').map((seg, i) => (
      i % 2 === 1
        ? <mark key={i} className="bg-yellow-500/30 text-foreground rounded-sm px-0.5">{seg}</mark>
        : <span key={i}>{seg}</span>
    ));
  };

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      addToast('Copied to clipboard', 'success');
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      addToast('Copy failed', 'error');
    }
  };

  return (
    <AnimatePresence>
      {selectedCitation && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-lg z-40"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 h-14 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <h3 className="font-semibold text-foreground truncate">
                    Source [{selectedCitation}]
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-4">
                {chunk ? (
                  <>
                    {paper && (
                      <Card>
                        <CardContent className="pt-6 space-y-2">
                          <h4 className="text-sm font-semibold text-foreground leading-snug">
                            {paper.title || paper.paper_id}
                          </h4>
                          {paper.authors.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {paper.authors.join(', ')}{paper.year ? ` · ${paper.year}` : ''}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {citedSentence && (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Cited claim
                          </p>
                          <p className="text-sm italic text-foreground/90 leading-relaxed">
                            "{citedSentence}"
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Card>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{chunk.section}</Badge>
                          <Badge variant="outline">{chunk.paper_id}</Badge>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {citedSentence ? renderHighlighted(highlightedChunk) : chunk.text}
                        </p>
                        <div className="pt-3 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => window.open(getArxivUrl(chunk.paper_id), '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View on arXiv</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {paperCitation && (
                      <Card>
                        <CardContent className="pt-6 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Citation
                          </p>
                          {(['apa', 'mla', 'ieee', 'chicago'] as CitationFormat[]).map((fmt) => {
                            const text = paperCitation.formats[fmt];
                            const key = `${chunk.paper_id}-${fmt}`;
                            const copied = copiedKey === key;
                            return (
                              <div key={fmt} className="flex items-start gap-2 group">
                                <span className="text-xs font-mono text-muted-foreground w-14 pt-1 flex-shrink-0">
                                  {FORMAT_LABELS[fmt]}
                                </span>
                                <p className="flex-1 text-xs text-foreground leading-relaxed">
                                  {text}
                                </p>
                                <button
                                  onClick={() => copyText(text, key)}
                                  className={cn(
                                    'opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 rounded hover:bg-secondary',
                                    copied && 'opacity-100',
                                  )}
                                  title="Copy citation"
                                >
                                  {copied
                                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                                    : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                  }
                                </button>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card className="text-center">
                    <CardContent className="py-12">
                      <p className="text-muted-foreground">No source available</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
