import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useAgentStore } from '@/stores/agentStore';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/stores/uiStore';
import { useState } from 'react';

export function TelemetryPanel() {
  const [expanded, setExpanded] = useState(true);
  const { telemetry } = useAgentStore();
  const { result, status } = useSynthesisStore();
  const { settingsOpen } = useUIStore();

  if (settingsOpen) return null;

  const totalCost = result?.cost_inr || 0;
  const duration = telemetry.length > 0 
    ? (Date.now() / 1000 - (telemetry[0]?.timestamp || 0))
    : 0;

  return (
    <AnimatePresence>
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-30"
        >
          <Card variant="glass" className="w-72">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                <span className="font-medium text-foreground">Telemetry</span>
              </div>
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">Total Cost</span>
                    </div>
                    <Badge variant="success">₹{totalCost.toFixed(2)}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Duration</span>
                    </div>
                    <span className="text-sm font-mono text-foreground">
                      {duration.toFixed(1)}s
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-muted-foreground mb-2">Agent Activity</p>
                    <div className="space-y-1">
                      {telemetry.map((event, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            {event.agent}
                          </span>
                          <Badge variant="default">{event.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
