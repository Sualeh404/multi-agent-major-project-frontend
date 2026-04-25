import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Microscope, Shield, BookTemplate, Loader2, CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAgentStore } from '@/stores/agentStore';
import { cn } from '@/utils/cn';
import { AGENT_ORDER, type AgentState, type AgentName } from '@/types';

const agentIcons: Record<AgentName, typeof Library> = {
  Librarian: Library,
  Analyst: Microscope,
  Critic: Shield,
  Synthesizer: BookTemplate,
};

const agentColors: Record<AgentName, string> = {
  Librarian: 'bg-blue-500',
  Analyst: 'bg-purple-500',
  Critic: 'bg-orange-500',
  Synthesizer: 'bg-green-500',
};

function AgentPill({ agent, index }: { agent: AgentState; index: number }) {
  const Icon = agentIcons[agent.name as AgentName] || Library;
  const colorClass = agentColors[agent.name as AgentName] || 'bg-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-300',
        agent.status === 'processing' && 'bg-primary/5 border border-primary/20',
        agent.status === 'completed' && 'bg-secondary',
        agent.status === 'pending' && 'bg-secondary/50 opacity-60',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          agent.status === 'pending' ? 'bg-muted' : colorClass,
          agent.status === 'processing' && 'animate-pulse',
        )}
      >
        <Icon className={cn('w-4 h-4', agent.status === 'pending' ? 'text-muted-foreground' : 'text-white')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{agent.name}</p>
        {agent.description && (
          <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {agent.status === 'pending' && <Circle className="w-4 h-4 text-muted-foreground/40" />}
        {agent.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {agent.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
      </div>
    </motion.div>
  );
}

interface AgentPipelineProps {
  collapsible?: boolean;
}

export function AgentPipeline({ collapsible = false }: AgentPipelineProps) {
  const { agents } = useAgentStore();
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = agents.filter((a) => a.status === 'completed').length;
  const progress = (completedCount / AGENT_ORDER.length) * 100;
  const isAllDone = completedCount === AGENT_ORDER.length;

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
          <h3 className="text-sm font-semibold text-foreground">Research Pipeline</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{AGENT_ORDER.length}
          </span>
        </div>
        {collapsible && (
          collapsed
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            isAllDone ? 'bg-green-500' : 'bg-primary',
          )}
        />
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-1.5 overflow-hidden"
          >
            {agents.map((agent, index) => (
              <AgentPill key={agent.id} agent={agent} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
