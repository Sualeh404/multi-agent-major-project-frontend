import { useState, useEffect, useRef } from 'react';

interface AgentStep {
  name: string;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  message?: string;
}

interface LiveAgentTrackerProps {
  sessionId: string;
  onStatusChange?: (status: string) => void;
}

export default function LiveAgentTracker({ sessionId, onStatusChange }: LiveAgentTrackerProps) {
  const [agents, setAgents] = useState<AgentStep[]>([
    { name: 'Librarian', status: 'pending' },
    { name: 'Analyst', status: 'pending' },
    { name: 'Critic', status: 'pending' },
    { name: 'Synthesizer', status: 'pending' },
  ]);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const socket = new WebSocket(`ws://localhost:8000/ws/v1/synthesis/${sessionId}`);
    ws.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAgents(prev => prev.map(agent => {
        if (agent.name === data.agent) {
          const newStatus = data.status === 'completed' ? 'completed' : 
                         data.status === 'rejected' ? 'rejected' : 'active';
          return { ...agent, status: newStatus, message: data.message };
        }
        return agent;
      }));
      onStatusChange?.(data.status);
    };

    return () => socket.close();
  }, [sessionId]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-blue-500 animate-pulse';
      case 'completed': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow" role="region" aria-label="Agent Progress Tracker">
      <h3 className="text-lg font-semibold mb-4">Pipeline Progress</h3>
      <div className="space-y-3">
        {agents.map((agent, idx) => (
          <div key={agent.name} className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${getStatusColor(agent.status)}`} 
                 aria-label={`${agent.name}: ${agent.status}`} />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{agent.name}</span>
                <span className="text-sm text-gray-500">{agent.status}</span>
              </div>
              {agent.message && (
                <p className="text-sm text-gray-600 mt-1">{agent.message}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
