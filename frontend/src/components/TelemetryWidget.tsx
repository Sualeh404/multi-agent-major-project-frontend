interface CostData {
  total_inr: number;
  llm_costs: Array<{
    agent: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_inr: number;
  }>;
}

interface TelemetryWidgetProps {
  costData: CostData;
  latency?: number;
  ragasScore?: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function TelemetryWidget({ 
  costData, 
  latency, 
  ragasScore, 
  isOpen, 
  onToggle 
}: TelemetryWidgetProps) {
  const getBudgetStatus = (cost: number) => {
    if (cost < 5) return { color: 'text-green-600', bg: 'bg-green-100' };
    if (cost < 8) return { color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { color: 'text-red-600', bg: 'bg-red-100' };
  };

  const budget = getBudgetStatus(costData.total_inr);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={onToggle}
        className={`p-3 rounded-full shadow-lg ${budget.bg} ${budget.color} font-bold`}
        aria-label={`Telemetry: ₹${costData.total_inr.toFixed(2)}`}
      >
        ₹{Math.round(costData.total_inr)}
      </button>

      {isOpen && (
        <div 
          className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl p-4 border"
          role="dialog"
          aria-label="Telemetry Details"
        >
          <h3 className="font-bold text-lg mb-3">Telemetry Dashboard</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Total Cost:</span>
              <span className={`font-bold ${budget.color}`}>₹{costData.total_inr.toFixed(2)}</span>
            </div>
            {latency && (
              <div className="flex justify-between">
                <span>Latency:</span>
                <span>{latency.toFixed(1)}s</span>
              </div>
            )}
            {ragasScore && (
              <div className="flex justify-between">
                <span>RAGAS Score:</span>
                <span className={ragasScore >= 0.9 ? 'text-green-600' : 'text-red-600'}>
                  {(ragasScore * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          <h4 className="font-semibold mb-2">Per-Agent Costs:</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {costData.llm_costs.map((cost, idx) => (
              <div key={idx} className="text-sm flex justify-between">
                <span>{cost.agent}:</span>
                <span>₹{cost.cost_inr.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
