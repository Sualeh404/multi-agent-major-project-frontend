import { motion } from 'framer-motion';
import { Library, Microscope, Shield, BookTemplate, Loader2, CheckCircle, XCircle, Circle } from 'lucide-react';
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

  const statusIcon = {
    pending: <Circle className="w-4 h-4 text-muted-foreground" />,
    processing: <Loader2 className="w-4 h-4 animate-spin text-accent" />,
    completed: <CheckCircle className="w-4 h-4 text-success" />,
    failed: <XCircle className="w-4 h-4 text-destructive" />,
  }[agent.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'transition-colors duration-300',
        agent.isActive ? 'bg-primary/10 border border-primary/30' : 'bg-secondary'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          colorClass,
          agent.status === 'processing' && 'animate-pulse-slow'
        )}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{agent.name}</p>
        <p className="text-xs text-muted-foreground uppercase">{agent.status}</p>
      </div>
      <div className="flex-shrink-0">{statusIcon}</div>
    </motion.div>
  );
}

export function AgentPipeline() {
  const { agents, wsConnected } = useAgentStore();

  const completedCount = agents.filter((a) => a.status === 'completed').length;
  const progress = (completedCount / AGENT_ORDER.length) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Research Pipeline</h3>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              wsConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
            )}
          />
          <span className="text-sm text-muted-foreground">
            {wsConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-accent rounded-full"
        />
      </div>

      <div className="space-y-2">
        {agents.map((agent, index) => (
          <AgentPill key={agent.id} agent={agent} index={index} />
        ))}
      </div>
    </div>
  );
}
