import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentGenome, EnvironmentState, PostMortem } from "@/data/types";
import { generateAgents, initialPostMortems, behavioralGenome, generationHistory } from "@/data/agentData";
import { callAiriaEvolve } from "@/lib/airiaClient";
import { toast } from "@/hooks/use-toast";
import AgentCard from "@/components/AgentCard";
import PostMortemFeed from "@/components/PostMortemFeed";
import BehavioralRadar from "@/components/BehavioralRadar";
import GenerationChart from "@/components/GenerationChart";
import SpeciesMap from "@/components/SpeciesMap";
import EnvironmentPanel from "@/components/EnvironmentPanel";
import GenerationControls from "@/components/GenerationControls";
import GenerationSummaryModal from "@/components/GenerationSummaryModal";
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
  const [generationSummary, setGenerationSummary] = useState<{
    generation: number;
    culled: { id: string; name: string; fitness: number; cause: string; inheritedBy: string[] }[];
    born: { id: string; name: string; fitness: number; parentIds: string[] }[];
    avgFitnessBefore: number;
    avgFitnessAfter: number;
    topFitness: number;
  } | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    regime: "trending",
    volatility: "medium",
    earningsActive: false,
    macroEvent: false,
    sentiment: 0.34,
  });

  const activeAgents = useMemo(() => agents.filter((a) => a.status !== "extinct"), [agents]);
  const extinctAgents = useMemo(() => agents.filter((a) => a.status === "extinct"), [agents]);

  const runGeneration = useCallback(async () => {
    setIsRunning(true);

    try {
      const sorted = [...agents].filter(a => a.status !== "extinct").sort((a, b) => b.fitness - a.fitness);
      const cullCount = Math.floor(sorted.length * 0.2);
      const bottom = sorted.slice(-cullCount);
      const top = sorted.slice(0, Math.floor(sorted.length * 0.2));

      // Call Airia via edge function
      const airiaResult = await callAiriaEvolve(top, bottom, currentGen, environment, behavior);

      if (airiaResult.source === "airia") {
        toast({ title: "Airia Orchestrator", description: airiaResult.generationInsight });
      } else {
        toast({ title: "Local Fallback", description: "Airia unavailable — used local evolution.", variant: "destructive" });
      }

      // Build post-mortems from Airia response
      const newPostMortems: PostMortem[] = airiaResult.postMortems.map((pm) => ({
        id: `pm-${Date.now()}-${pm.agentId}`,
        agentId: pm.agentId,
        agentName: pm.agentName,
        generation: currentGen,
        cause: pm.cause,
        inheritedBy: pm.inheritedBy,
        timestamp: new Date(),
        fitnessAtDeath: bottom.find(a => a.id === pm.agentId)?.fitness || 0,
      }));

      // Build new agents from Airia offspring
      const newAgents: AgentGenome[] = airiaResult.offspring.map((child, i) => ({
        id: `AGT-${String(agents.length + i + 1).padStart(3, "0")}`,
        name: child.name,
        generation: currentGen + 1,
        fitness: child.fitness,
        status: "newborn" as const,
        archetype: child.archetype as AgentGenome["archetype"],
        sharpe: Math.round((child.fitness / 30) * 100) / 100,
        maxDrawdown: Math.round((1 - child.genome.riskTolerance) * 20 * 10) / 10,
        winRate: Math.round((45 + child.fitness * 0.3) * 10) / 10,
        totalReturn: Math.round((child.fitness * 0.4 - 10) * 100) / 100,
        trades: 0,
        parentIds: child.parentIds,
        genome: child.genome,
      }));

      setPostMortems((pm) => [...newPostMortems, ...pm].slice(0, 10));

      const avgBefore = sorted.reduce((s, a) => s + a.fitness, 0) / sorted.length;

      const updated = agents.map((a) => {
        if (bottom.find((c) => c.id === a.id)) {
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

      const allNext = [...updated, ...newAgents];
      const activeNext = allNext.filter(a => a.status !== "extinct");
      const avgAfter = activeNext.reduce((s, a) => s + a.fitness, 0) / activeNext.length;
      const topFit = Math.max(...activeNext.map(a => a.fitness));

      setGenerationSummary({
        generation: currentGen + 1,
        culled: bottom.map((a) => ({
          id: a.id,
          name: a.name,
          fitness: a.fitness,
          cause: airiaResult.postMortems.find(pm => pm.agentId === a.id)?.cause || "Culled due to low fitness.",
          inheritedBy: top.slice(0, 2).map(t => t.id),
        })),
        born: newAgents.map((a) => ({
          id: a.id,
          name: a.name,
          fitness: a.fitness,
          parentIds: a.parentIds || [],
        })),
        avgFitnessBefore: Math.round(avgBefore * 10) / 10,
        avgFitnessAfter: Math.round(avgAfter * 10) / 10,
        topFitness: Math.round(topFit * 10) / 10,
      });

      setAgents(allNext);
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

      if (airiaResult.diversityAlert) {
        toast({ title: "⚠️ Diversity Alert", description: `Population converging. Suggested chaos archetype: ${airiaResult.chaosArchetype}` });
      }

    } catch (err) {
      console.error("Generation failed:", err);
      toast({ title: "Generation Failed", description: "Error running evolution cycle.", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  }, [agents, currentGen, environment, behavior]);

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

      <GenerationSummaryModal
        summary={generationSummary}
        onClose={() => setGenerationSummary(null)}
      />
    </div>
  );
}
