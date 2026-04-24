import { useSynthesisStore } from '@/stores/synthesisStore';
import { useAgentStore } from '@/stores/agentStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Activity, Clock, DollarSign, CheckCircle, Loader2, Circle } from 'lucide-react';

export function TelemetryContent() {
  const { result } = useSynthesisStore();
  const { telemetry, agents } = useAgentStore();
  
  const totalCost = result?.cost_inr || 0;
  
  // Calculate duration from telemetry timestamps
  let duration = 0;
  if (telemetry.length > 0) {
    const first = telemetry[0]?.timestamp || 0;
    const last = telemetry[telemetry.length - 1]?.timestamp || 0;
    duration = last - first;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Telemetry Dashboard
        </CardTitle>
        <CardDescription>
          Real-time cost and agent activity tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Cost</span>
            </div>
            <p className="text-2xl font-bold">₹{totalCost.toFixed(2)}</p>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Duration</span>
            </div>
            <p className="text-2xl font-bold">{duration.toFixed(1)}s</p>
          </div>
        </div>

        <Separator />

        {/* Agent Activity */}
        <div>
          <h3 className="text-sm font-medium mb-3">Agent Activity</h3>
          <div className="space-y-2">
            {agents.map((agent) => {
              const statusIcon = {
                pending: <Circle className="w-4 h-4 text-muted-foreground" />,
                processing: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
                completed: <CheckCircle className="w-4 h-4 text-green-500" />,
                failed: <Circle className="w-4 h-4 text-destructive" />,
              }[agent.status];

              return (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {statusIcon}
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  <Badge variant={agent.status === 'completed' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Telemetry Events Timeline */}
        {telemetry.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">Event Timeline</h3>
            <div className="space-y-2">
              {telemetry.map((event, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{event.agent}</span>
                  <Badge variant="outline">{event.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
