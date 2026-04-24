import { X, ExternalLink, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function CitationPanel() {
  const { selectedCitation, setSelectedCitation, selectedChunk, setSelectedChunk } = useUIStore();
  const { result } = useSynthesisStore();

  const handleClose = () => {
    setSelectedCitation(null);
    setSelectedChunk(null);
  };

  const citationNumber = selectedCitation ? parseInt(selectedCitation) : null;
  const chunk = result?.chunks?.[(citationNumber ?? 1) - 1];

  return (
    <AnimatePresence>
      {selectedCitation && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-muted border-l border-gray-200 shadow-apple-xl z-20"
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-background-primary">
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
                <Card variant="default">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{chunk.section}</Badge>
                      <Badge variant="outline">{chunk.paper_id}</Badge>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground leading-relaxed">
                        {chunk.text}
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(chunk.text, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Original Source</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card variant="default" className="text-center">
                  <p className="text-muted-foreground">No source available</p>
                </Card>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
