import { useMemo } from "react";
import { AgentGenome } from "@/data/types";
import { PieChart, TrendingUp, Shield, Activity, Shuffle, Dna } from "lucide-react";

interface StrategyAllocationProps {
  agents: AgentGenome[];
  totalCapital: number;
}

const archetypeConfig: Record<string, { icon: any; color: string; label: string }> = {
  momentum: { icon: TrendingUp, color: "bg-apex-cyan/20 text-apex-cyan border-apex-cyan/30", label: "Momentum" },
  defensive: { icon: Shield, color: "bg-apex-amber/20 text-apex-amber border-apex-amber/30", label: "Defensive" },
  volatility: { icon: Activity, color: "bg-apex-purple/20 text-apex-purple border-apex-purple/30", label: "Volatility" },
  "mean-reversion": { icon: Shuffle, color: "bg-primary/20 text-primary border-primary/30", label: "Mean Rev." },
  hybrid: { icon: Dna, color: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30", label: "Hybrid" },
};

export default function StrategyAllocation({ agents, totalCapital }: StrategyAllocationProps) {
  const allocations = useMemo(() => {
    const active = agents.filter(a => a.status !== "extinct");
    const totalFitness = active.reduce((s, a) => s + Math.max(a.fitness, 0), 0);
    if (totalFitness === 0) return [];

    const byArchetype: Record<string, { count: number; totalFitness: number; avgSharpe: number }> = {};
    active.forEach(a => {
      if (!byArchetype[a.archetype]) {
        byArchetype[a.archetype] = { count: 0, totalFitness: 0, avgSharpe: 0 };
      }
      byArchetype[a.archetype].count++;
      byArchetype[a.archetype].totalFitness += Math.max(a.fitness, 0);
      byArchetype[a.archetype].avgSharpe += a.sharpe;
    });

    return Object.entries(byArchetype)
      .map(([archetype, data]) => ({
        archetype,
        count: data.count,
        allocationPercent: (data.totalFitness / totalFitness) * 100,
        capitalAllocated: (data.totalFitness / totalFitness) * totalCapital,
        avgSharpe: data.avgSharpe / data.count,
      }))
      .sort((a, b) => b.allocationPercent - a.allocationPercent);
  }, [agents, totalCapital]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <PieChart className="h-4 w-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Strategy Allocation
        </h3>
      </div>

      {/* Allocation bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-0.5">
        {allocations.map(a => {
          const config = archetypeConfig[a.archetype];
          return (
            <div
              key={a.archetype}
              className={`h-full rounded-sm ${config?.color.split(" ")[0] || "bg-muted"}`}
              style={{ width: `${a.allocationPercent}%` }}
              title={`${config?.label}: ${a.allocationPercent.toFixed(1)}%`}
            />
          );
        })}
      </div>

      <div className="space-y-2">
        {allocations.map(a => {
          const config = archetypeConfig[a.archetype];
          const Icon = config?.icon || Dna;
          return (
            <div key={a.archetype} className={`flex items-center justify-between p-2 rounded-lg border ${config?.color || ""}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">{config?.label || a.archetype}</span>
                <span className="text-[9px] font-mono text-muted-foreground">×{a.count}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Sharpe {a.avgSharpe.toFixed(2)}
                </span>
                <span className="text-[11px] font-mono font-semibold">
                  ${Math.round(a.capitalAllocated).toLocaleString()}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {a.allocationPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
