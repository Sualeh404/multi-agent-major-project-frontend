import { useEffect, useState } from 'react';
import { useSynthesisStore } from '@/stores/synthesisStore';
import { useAgentStore } from '@/stores/agentStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Activity, Clock, IndianRupee, CheckCircle, Loader2, Circle, CalendarDays } from 'lucide-react';
import { todaySpend, last7DaysSpend, allTimeSpend } from '@/utils/spend';

export function TelemetryContent() {
  const { result } = useSynthesisStore();
  const { telemetry, agents } = useAgentStore();

  const sessionCost = result?.cost_inr || 0;

  // Read ledger reactively — bump on tab open / when costs change
  const [spend, setSpend] = useState({ today: 0, week: 0, all: 0 });
  useEffect(() => {
    setSpend({ today: todaySpend(), week: last7DaysSpend(), all: allTimeSpend() });
  }, [sessionCost, telemetry.length]);

  let duration = 0;
  if (telemetry.length > 0) {
    const first = telemetry[0]?.timestamp || 0;
    const last = telemetry[telemetry.length - 1]?.timestamp || 0;
    duration = last - first;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Current run
          </CardTitle>
          <CardDescription>Cost and timing for the session loaded right now</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <IndianRupee className="w-4 h-4" />
                <span className="text-sm">Session cost</span>
              </div>
              <p className="text-2xl font-bold">₹{sessionCost.toFixed(2)}</p>
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

          <div>
            <h3 className="text-sm font-medium mb-3">Agent activity</h3>
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

          {telemetry.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-3">Event timeline</h3>
                <div className="space-y-2">
                  {telemetry.map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{event.agent}</span>
                      <Badge variant="outline">{event.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="w-5 h-5" />
            Your spend across all sessions
          </CardTitle>
          <CardDescription>Aggregated from completed runs on this device · localStorage</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {[
            { label: 'Today',     value: spend.today },
            { label: 'Last 7 days', value: spend.week },
            { label: 'All time',  value: spend.all },
          ].map((s) => (
            <div key={s.label} className="p-3 rounded-lg border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-semibold mt-1">₹{s.value.toFixed(2)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
