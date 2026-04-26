import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Loader2, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { cn } from '@/utils/cn';
import { AGENT_ORDER } from '@/types';

const AGENT_COLORS: Record<string, string> = {
  Librarian: 'text-blue-500',
  Analyst: 'text-purple-500',
  Critic: 'text-orange-500',
  Synthesizer: 'text-green-500',
  RAGAS: 'text-cyan-500',
  System: 'text-red-500',
  User: 'text-yellow-500',
};

function fmtTime(ts: number, base: number): string {
  const seconds = Math.max(0, Math.floor(ts - base));
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

interface AgentPipelineProps {
  collapsible?: boolean;
}

export function AgentPipeline({ collapsible = false }: AgentPipelineProps) {
  const { agents, telemetry } = useAgentStore();
  const { result } = useSynthesisStore();
  const [collapsed, setCollapsed] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const completedCount = agents.filter((a) => a.status === 'completed').length;
  const progress = (completedCount / AGENT_ORDER.length) * 100;
  const isAllDone = completedCount === AGENT_ORDER.length;
  const activeAgent = agents.find((a) => a.status === 'processing');

  // Derive events for the terminal feed: combine optimistic per-agent state + actual telemetry
  const baseTime = telemetry[0]?.timestamp ?? Math.floor(Date.now() / 1000);

  // Auto-scroll feed to bottom on new events
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [telemetry.length]);

  const events = telemetry.length > 0 ? telemetry : [];

  // If no telemetry yet but we have agents in 'processing', show optimistic line
  const optimisticLine = telemetry.length === 0 && activeAgent
    ? `${activeAgent.name} — ${activeAgent.description || 'starting...'}`
    : null;

  // Add detail-rich descriptions per known event using the result data
  const enrichedDescription = (agent: string, status: string): string => {
    const chunks = result?.chunks?.length ?? 0;
    const papers = result?.papers?.length ?? 0;
    const analyses = result?.analyses?.length ?? 0;
    const audits = result?.audits?.length ?? 0;
    if (agent === 'Librarian' && status === 'completed') {
      return `retrieved ${chunks} chunks from ${papers} papers`;
    }
    if (agent === 'Analyst' && status === 'completed') {
      return `extracted ${analyses} methodologies`;
    }
    if (agent === 'Critic') {
      if (status === 'completed') return `audit passed (${audits} reviews)`;
      if (status === 'revision_needed') return `revision needed — looping back`;
    }
    if (agent === 'Synthesizer' && status === 'completed') {
      const len = result?.synthesis?.length ?? 0;
      return `synthesis compiled (${len} chars)`;
    }
    return status;
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => collapsible && setCollapsed(!collapsed)}
        className={cn(
          'flex items-center justify-between w-full text-left',
          collapsible && 'cursor-pointer',
        )}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Agent Trace</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{AGENT_ORDER.length}
            {activeAgent && !isAllDone && (
              <> · <span className="text-primary">{activeAgent.name}</span></>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isAllDone && activeAgent && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          {isAllDone && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
          {collapsible && (
            collapsed
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn('h-full rounded-full', isAllDone ? 'bg-green-500' : 'bg-primary')}
        />
      </div>

      {/* Terminal feed */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              ref={feedRef}
              className="font-mono text-xs leading-relaxed bg-secondary/50 rounded-lg p-3 max-h-64 overflow-y-auto space-y-0.5"
            >
              {events.length === 0 && !optimisticLine && (
                <div className="text-muted-foreground italic">Waiting for agent events...</div>
              )}
              {events.map((ev: any, idx) => {
                const agent = ev.agent || 'System';
                const ts = typeof ev.timestamp === 'number' ? ev.timestamp : baseTime;
                const status = ev.status || '';
                const description = enrichedDescription(agent, status);
                const colorClass = AGENT_COLORS[agent] ?? 'text-foreground';
                return (
                  <div key={idx} className="flex gap-2">
                    <span className="text-muted-foreground/60 flex-shrink-0">{fmtTime(ts, baseTime)}</span>
                    <span className={cn('flex-shrink-0 font-semibold', colorClass)}>{agent}</span>
                    <span className="text-foreground/80 break-all">{description}</span>
                  </div>
                );
              })}
              {optimisticLine && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground/60 flex-shrink-0">{fmtTime(Date.now() / 1000, baseTime)}</span>
                  <span className={cn('flex-shrink-0 font-semibold animate-pulse', activeAgent ? AGENT_COLORS[activeAgent.name] : '')}>
                    {activeAgent?.name}
                  </span>
                  <span className="text-foreground/80">{activeAgent?.description}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
