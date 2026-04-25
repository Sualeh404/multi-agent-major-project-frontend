import { useEffect } from 'react';
import { X, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getArxivUrl } from '@/utils/arxiv';

export function CitationPanel() {
  const { selectedCitation, setSelectedCitation, setSelectedChunk } = useUIStore();
  const { result } = useSynthesisStore();

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

  const citationNumber = selectedCitation ? parseInt(selectedCitation) : null;
  const chunk = result?.chunks?.[(citationNumber ?? 1) - 1];

  return (
    <AnimatePresence>
      {selectedCitation && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border shadow-lg z-40"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 h-14 border-b border-border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">
                    Source [{selectedCitation}]
                  </h3>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {chunk ? (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{chunk.section}</Badge>
                        <Badge variant="outline">{chunk.paper_id}</Badge>
                      </div>

                      <p className="text-sm text-foreground leading-relaxed">
                        {chunk.text}
                      </p>

                      <div className="pt-4 border-t border-border">
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
