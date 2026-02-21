import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentGenome, EnvironmentState, PostMortem } from "@/data/types";
import { generateAgents, initialPostMortems, behavioralGenome, generationHistory } from "@/data/agentData";
import AgentCard from "@/components/AgentCard";
import PostMortemFeed from "@/components/PostMortemFeed";
import BehavioralRadar from "@/components/BehavioralRadar";
import GenerationChart from "@/components/GenerationChart";
import SpeciesMap from "@/components/SpeciesMap";
import EnvironmentPanel from "@/components/EnvironmentPanel";
import GenerationControls from "@/components/GenerationControls";
import { Dna, Activity, Brain } from "lucide-react";

const strategies = [
  "Momentum Alpha", "Mean Reversion", "Breakout Hunter", "Volatility Arbitrage",
  "Trend Follower", "Scalp Master", "Swing Trader", "Gap Fill", "RSI Divergence",
  "MACD Crossover",
];
const archetypes: AgentGenome["archetype"][] = ["momentum", "defensive", "volatility", "mean-reversion", "hybrid"];

export default function Index() {
  const [agents, setAgents] = useState<AgentGenome[]>(() => generateAgents(40));
  const [postMortems, setPostMortems] = useState<PostMortem[]>(initialPostMortems);
  const [behavior, setBehavior] = useState(behavioralGenome);
  const [genHistory, setGenHistory] = useState(generationHistory);
  const [currentGen, setCurrentGen] = useState(3);
  const [isRunning, setIsRunning] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    regime: "trending",
    volatility: "medium",
    earningsActive: false,
    macroEvent: false,
    sentiment: 0.34,
  });

  const activeAgents = useMemo(() => agents.filter((a) => a.status !== "extinct"), [agents]);
  const extinctAgents = useMemo(() => agents.filter((a) => a.status === "extinct"), [agents]);

  const runGeneration = useCallback(() => {
    setIsRunning(true);

    setTimeout(() => {
      setAgents((prev) => {
        const sorted = [...prev].filter(a => a.status !== "extinct").sort((a, b) => b.fitness - a.fitness);
        const cullCount = Math.floor(sorted.length * 0.2);
        const culled = sorted.slice(-cullCount);
        const top = sorted.slice(0, Math.floor(sorted.length * 0.2));

        const newPostMortems: PostMortem[] = culled.map((agent) => ({
          id: `pm-${Date.now()}-${agent.id}`,
          agentId: agent.id,
          agentName: agent.name,
          generation: agent.generation,
          cause: `Eliminated in generation ${currentGen + 1} selection. Fitness score ${agent.fitness.toFixed(1)} fell below survival threshold. ${
            agent.sharpe < 0.5 ? "Weak risk-adjusted returns." : ""
          } ${agent.maxDrawdown > 15 ? `Excessive drawdown of ${agent.maxDrawdown}%.` : ""} ${
            agent.winRate < 45 ? "Sub-par win rate." : ""
          } Genome traits propagated to offspring.`,
          inheritedBy: top.slice(0, 2).map((t) => t.id),
          timestamp: new Date(),
          fitnessAtDeath: agent.fitness,
        }));

        const newAgents = culled.map((_, i) => {
          const p1 = top[i % top.length];
          const p2 = top[(i + 1) % top.length];
          const newId = `AGT-${String(prev.length + i + 1).padStart(3, "0")}`;
          return {
            id: newId,
            name: strategies[Math.floor(Math.random() * strategies.length)],
            generation: currentGen + 1,
            fitness: Math.round(((p1.fitness + p2.fitness) / 2 + (Math.random() * 10 - 3)) * 10) / 10,
            status: "newborn" as const,
            archetype: archetypes[Math.floor(Math.random() * archetypes.length)],
            sharpe: Math.round(((p1.sharpe + p2.sharpe) / 2 + (Math.random() * 0.4 - 0.1)) * 100) / 100,
            maxDrawdown: Math.round(((p1.maxDrawdown + p2.maxDrawdown) / 2) * 10) / 10,
            winRate: Math.round(((p1.winRate + p2.winRate) / 2 + (Math.random() * 5 - 2)) * 10) / 10,
            totalReturn: Math.round(((p1.totalReturn + p2.totalReturn) / 2 + (Math.random() * 5 - 1)) * 100) / 100,
            trades: 0,
            parentIds: [p1.id, p2.id],
            genome: {
              entryLogic: Math.round(((p1.genome.entryLogic + p2.genome.entryLogic) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
              exitDiscipline: Math.round(((p1.genome.exitDiscipline + p2.genome.exitDiscipline) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
              riskTolerance: Math.round(((p1.genome.riskTolerance + p2.genome.riskTolerance) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
              positionSizing: Math.round(((p1.genome.positionSizing + p2.genome.positionSizing) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
              indicatorWeight: Math.round(((p1.genome.indicatorWeight + p2.genome.indicatorWeight) / 2 + (Math.random() * 0.1 - 0.05)) * 100) / 100,
            },
          } as AgentGenome;
        });

        setPostMortems((pm) => [...newPostMortems, ...pm].slice(0, 10));

        // Update surviving agents with slight fitness changes
        const updated = prev.map((a) => {
          if (culled.find((c) => c.id === a.id)) {
            return { ...a, status: "extinct" as const };
          }
          if (a.status === "newborn") {
            return { ...a, status: "active" as const };
          }
          return {
            ...a,
            fitness: Math.round((a.fitness + (Math.random() * 6 - 2)) * 10) / 10,
            trades: a.trades + Math.floor(Math.random() * 20),
          };
        });

        return [...updated, ...newAgents];
      });

      setCurrentGen((g) => g + 1);
      setGenHistory((h) => {
        const lastTop = h[h.length - 1]?.topFitness || 70;
        const lastAvg = h[h.length - 1]?.avgFitness || 45;
        return [...h, {
          gen: h.length,
          avgFitness: Math.round((lastAvg + Math.random() * 5 + 1) * 10) / 10,
          topFitness: Math.round((lastTop + Math.random() * 4 + 1) * 10) / 10,
          population: 40,
          diversity: Math.round((0.6 + Math.random() * 0.3) * 100) / 100,
        }];
      });

      setIsRunning(false);
    }, 2500);
  }, [currentGen]);

  const handleRegimeChange = useCallback((regime: EnvironmentState["regime"]) => {
    setEnvironment((e) => ({
      ...e,
      regime,
      volatility: regime === "risk-off" ? "high" : regime === "choppy" ? "medium" : "low",
      sentiment: regime === "risk-on" ? 0.65 : regime === "risk-off" ? -0.42 : regime === "trending" ? 0.34 : 0.05,
    }));
  }, []);

  const handleOverride = useCallback(() => {
    setBehavior((b) => ({
      ...b,
      riskTolerance: Math.max(0, Math.min(1, b.riskTolerance + (Math.random() * 0.1 - 0.05))),
      drawdownSensitivity: Math.max(0, Math.min(1, b.drawdownSensitivity + (Math.random() * 0.08 - 0.02))),
      holdingPatience: Math.max(0, Math.min(1, b.holdingPatience + (Math.random() * 0.06 - 0.03))),
    }));
  }, []);

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Dna className="h-7 w-7 text-primary text-glow-green" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse-green" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-primary text-glow-green">APEX</span>
                <span className="text-muted-foreground font-normal ml-2 text-sm">Autonomous Population of Evolving eXperts</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary animate-pulse-green" />
              <span>LIVE</span>
            </div>
            <span>·</span>
            <span>Airia Orchestrated</span>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-accent" />
              <span>Self-Evolving</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6 space-y-6">
        {/* Controls */}
        <GenerationControls
          currentGeneration={currentGen}
          isRunning={isRunning}
          onRunGeneration={runGeneration}
          activeCount={activeAgents.length}
          extinctCount={extinctAgents.length}
        />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Agent Grid — Left 8 cols */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Evolution Theater — Agent Population
                </h2>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {activeAgents.length} alive · {extinctAgents.length} extinct
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                <AnimatePresence mode="popLayout">
                  {agents.slice(0, 40).map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <GenerationChart data={genHistory} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <SpeciesMap agents={agents} />
              </div>
            </div>
          </div>

          {/* Right sidebar — 4 cols */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <EnvironmentPanel environment={environment} onRegimeChange={handleRegimeChange} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <BehavioralRadar genome={behavior} />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOverride}
                className="mt-3 w-full rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-mono font-medium text-accent transition-colors hover:bg-accent/20"
              >
                Simulate Trade Override
              </motion.button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <PostMortemFeed postMortems={postMortems} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
