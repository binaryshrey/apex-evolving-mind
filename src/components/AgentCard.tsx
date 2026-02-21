import { motion } from "framer-motion";
import { AgentGenome } from "@/data/types";
import { Skull, Sparkles, TrendingUp, Shield, Activity, Shuffle, Dna } from "lucide-react";

const archetypeIcons = {
  momentum: TrendingUp,
  defensive: Shield,
  volatility: Activity,
  "mean-reversion": Shuffle,
  hybrid: Dna,
};

const archetypeColors: Record<string, string> = {
  momentum: "text-apex-cyan",
  defensive: "text-apex-amber",
  volatility: "text-apex-purple",
  "mean-reversion": "text-apex-green",
  hybrid: "text-muted-foreground",
};

interface AgentCardProps {
  agent: AgentGenome;
  onClick?: () => void;
}

export default function AgentCard({ agent, onClick }: AgentCardProps) {
  const Icon = archetypeIcons[agent.archetype];
  const isAlive = agent.status === "active" || agent.status === "newborn";
  const isNewborn = agent.status === "newborn";
  const isExtinct = agent.status === "extinct";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: isExtinct ? 0.4 : 1, 
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-lg border p-3 transition-colors
        ${isNewborn ? "border-primary glow-green bg-card" : ""}
        ${isExtinct ? "border-destructive/30 bg-card/50" : ""}
        ${agent.status === "active" ? "border-border bg-card hover:border-primary/50" : ""}
        ${agent.status === "breeding" ? "border-apex-cyan/50 glow-cyan bg-card" : ""}
      `}
    >
      {isNewborn && (
        <div className="absolute -top-2 -right-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse-green" />
        </div>
      )}
      {isExtinct && (
        <div className="absolute -top-2 -right-2">
          <Skull className="h-4 w-4 text-destructive" />
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-muted-foreground">{agent.id}</span>
        <span className="font-mono text-[10px] text-muted-foreground">G{agent.generation}</span>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`h-3.5 w-3.5 ${archetypeColors[agent.archetype]}`} />
        <span className="text-xs font-medium truncate">{agent.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <div className="text-[10px] text-muted-foreground">Fitness</div>
          <div className={`text-sm font-mono font-semibold ${agent.fitness > 60 ? "text-primary" : agent.fitness > 35 ? "text-apex-amber" : "text-destructive"}`}>
            {agent.fitness.toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Sharpe</div>
          <div className={`text-sm font-mono font-semibold ${agent.sharpe > 1 ? "text-primary" : agent.sharpe > 0 ? "text-foreground" : "text-destructive"}`}>
            {agent.sharpe.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Win%</div>
          <div className="text-xs font-mono text-foreground">{agent.winRate}%</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Return</div>
          <div className={`text-xs font-mono ${agent.totalReturn > 0 ? "text-primary" : "text-destructive"}`}>
            {agent.totalReturn > 0 ? "+" : ""}{agent.totalReturn}%
          </div>
        </div>
      </div>

      {/* Mini genome bar */}
      <div className="mt-2 flex gap-0.5 h-1">
        {Object.values(agent.genome).map((val, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-primary/20"
          >
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${val * 100}%` }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
