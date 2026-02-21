import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentGenome, EnvironmentState, PostMortem, BehavioralGenome } from "@/data/types";
import { callAiriaEvolve } from "@/lib/airiaClient";
import {
  fetchAgents, upsertAgents, insertAgents,
  fetchGenerations, insertGeneration,
  fetchPostMortems, insertPostMortems,
  fetchEnvironment, updateEnvironment,
  fetchBehavioralGenome,
  fetchPortfolio, insertPortfolioSnapshot,
} from "@/lib/dbClient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AgentCard from "@/components/AgentCard";
import PostMortemFeed from "@/components/PostMortemFeed";
import BehavioralRadar from "@/components/BehavioralRadar";
import GenerationChart from "@/components/GenerationChart";
import SpeciesMap from "@/components/SpeciesMap";
import EnvironmentPanel from "@/components/EnvironmentPanel";
import GenerationControls from "@/components/GenerationControls";
import GenerationSummaryModal from "@/components/GenerationSummaryModal";
import PortfolioWidget, { PortfolioState } from "@/components/PortfolioWidget";
import PerformanceLeaderboard from "@/components/PerformanceLeaderboard";
import StrategyAllocation from "@/components/StrategyAllocation";
import GuidedTour from "@/components/GuidedTour";
import { Dna, Activity, Brain, Loader2 } from "lucide-react";

export default function Index() {
  const [agents, setAgents] = useState<AgentGenome[]>([]);
  const [postMortems, setPostMortems] = useState<PostMortem[]>([]);
  const [behavior, setBehavior] = useState<BehavioralGenome>({
    riskTolerance: 0.62, drawdownSensitivity: 0.78, earningsAvoidance: 0.45,
    momentumBias: 0.33, holdingPatience: 0.71,
  });
  const [genHistory, setGenHistory] = useState<{ gen: number; avgFitness: number; topFitness: number; population: number; diversity: number }[]>([]);
  const [currentGen, setCurrentGen] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioState>({ capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 });
  const [generationSummary, setGenerationSummary] = useState<{
    generation: number;
    culled: { id: string; name: string; fitness: number; cause: string; inheritedBy: string[] }[];
    born: { id: string; name: string; fitness: number; parentIds: string[] }[];
    avgFitnessBefore: number;
    avgFitnessAfter: number;
    topFitness: number;
    capitalBefore: number;
    capitalAfter: number;
  } | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    regime: "trending", volatility: "medium", earningsActive: false, macroEvent: false, sentiment: 0.34,
  });

  // ─── Load all data from DB on mount ───
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [dbAgents, dbGens, dbPMs, dbEnv, dbBehavior, dbPortfolio] = await Promise.all([
          fetchAgents(),
          fetchGenerations(),
          fetchPostMortems(),
          fetchEnvironment(),
          fetchBehavioralGenome(),
          fetchPortfolio().catch(() => ({ capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 })),
        ]);

        if (dbAgents.length > 0) {
          setAgents(dbAgents);
          setGenHistory(dbGens);
          setPostMortems(dbPMs);
          setEnvironment(dbEnv);
          setBehavior(dbBehavior);
          setPortfolio(dbPortfolio);
          setCurrentGen(dbGens.length > 0 ? Math.max(...dbGens.map(g => g.gen)) : 0);
          
          // Show tour on first visit
          const hasSeenTour = localStorage.getItem("apex-tour-seen");
          if (!hasSeenTour) setShowTour(true);
        } else {
          toast({ title: "Initializing Population", description: "Generating 40 trading agents via AI..." });
          const { data, error } = await supabase.functions.invoke("generate-population");
          if (error) throw error;
          
          const [newAgents, newGens] = await Promise.all([fetchAgents(), fetchGenerations()]);
          setAgents(newAgents);
          setGenHistory(newGens);
          setCurrentGen(0);
          setShowTour(true);
          toast({ title: "Population Ready", description: `${newAgents.length} AI-generated agents deployed.` });
        }

        supabase.functions.invoke("fetch-market-data").then(async ({ data }) => {
          if (data?.regime) {
            const freshEnv = await fetchEnvironment();
            setEnvironment(freshEnv);
            toast({ title: "Market Scan", description: data.rationale || `Regime: ${data.regime}` });
          }
        }).catch(console.error);

      } catch (err) {
        console.error("Failed to load data:", err);
        toast({ title: "Error", description: "Failed to load data from database.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const activeAgents = useMemo(() => agents.filter((a) => a.status !== "extinct"), [agents]);
  const extinctAgents = useMemo(() => agents.filter((a) => a.status === "extinct"), [agents]);

  const runGeneration = useCallback(async () => {
    setIsRunning(true);
    try {
      const sorted = [...agents].filter(a => a.status !== "extinct").sort((a, b) => b.fitness - a.fitness);
      const cullCount = Math.floor(sorted.length * 0.2);
      const bottom = sorted.slice(-cullCount);
      const top = sorted.slice(0, Math.floor(sorted.length * 0.2));

      const airiaResult = await callAiriaEvolve(top, bottom, currentGen, environment, behavior);

      if (airiaResult.source === "airia") {
        toast({ title: "Airia Orchestrator", description: airiaResult.generationInsight });
      } else {
        toast({ title: "Local Fallback", description: "Airia unavailable — used local evolution.", variant: "destructive" });
      }

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

      const maxId = Math.max(...agents.map(a => parseInt(a.id.replace("AGT-", ""), 10)), 0);
      const newAgents: AgentGenome[] = airiaResult.offspring.map((child, i) => ({
        id: `AGT-${String(maxId + i + 1).padStart(3, "0")}`,
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

      const avgBefore = sorted.reduce((s, a) => s + a.fitness, 0) / sorted.length;

      const updated = agents.map((a) => {
        if (bottom.find((c) => c.id === a.id)) return { ...a, status: "extinct" as const };
        if (a.status === "newborn") return { ...a, status: "active" as const };
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
      const topAgent = activeNext.reduce((best, a) => a.fitness > best.fitness ? a : best, activeNext[0]);

      // Calculate portfolio change based on agent performance
      const capitalBefore = portfolio.capital;
      const performanceMultiplier = (avgAfter - avgBefore) / 100;
      const newCapital = Math.round(capitalBefore * (1 + performanceMultiplier));
      const totalPnl = newCapital - 100000;
      const totalPnlPercent = ((newCapital - 100000) / 100000) * 100;

      const genData = {
        gen: currentGen + 1,
        avgFitness: Math.round(avgAfter * 10) / 10,
        topFitness: Math.round(topFit * 10) / 10,
        population: activeNext.length,
        diversity: Math.round((0.6 + Math.random() * 0.3) * 100) / 100,
      };

      // Serialize agent upserts to avoid deadlocks
      await upsertAgents(updated);
      await Promise.all([
        upsertAgents(newAgents),
        insertPostMortems(newPostMortems),
        insertGeneration(genData),
        insertPortfolioSnapshot({
          generation: currentGen + 1,
          capital: newCapital,
          pnl: totalPnl,
          pnlPercent: Math.round(totalPnlPercent * 100) / 100,
          topAgentId: topAgent?.id,
          topAgentName: topAgent?.name,
          avgFitnessBefore: Math.round(avgBefore * 10) / 10,
          avgFitnessAfter: Math.round(avgAfter * 10) / 10,
        }),
      ]);

      setPortfolio({ capital: newCapital, pnl: totalPnl, pnlPercent: Math.round(totalPnlPercent * 100) / 100, generation: currentGen + 1 });

      setGenerationSummary({
        generation: currentGen + 1,
        culled: bottom.map((a) => ({
          id: a.id, name: a.name, fitness: a.fitness,
          cause: airiaResult.postMortems.find(pm => pm.agentId === a.id)?.cause || "Culled due to low fitness.",
          inheritedBy: top.slice(0, 2).map(t => t.id),
        })),
        born: newAgents.map((a) => ({ id: a.id, name: a.name, fitness: a.fitness, parentIds: a.parentIds || [] })),
        avgFitnessBefore: Math.round(avgBefore * 10) / 10,
        avgFitnessAfter: Math.round(avgAfter * 10) / 10,
        topFitness: Math.round(topFit * 10) / 10,
        capitalBefore,
        capitalAfter: newCapital,
      });

      setAgents(allNext);
      setPostMortems((pm) => [...newPostMortems, ...pm].slice(0, 20));
      setCurrentGen((g) => g + 1);
      setGenHistory((h) => [...h, genData]);

      if (airiaResult.diversityAlert) {
        toast({ title: "⚠️ Diversity Alert", description: `Population converging. Suggested chaos archetype: ${airiaResult.chaosArchetype}` });
      }
    } catch (err) {
      console.error("Generation failed:", err);
      toast({ title: "Generation Failed", description: "Error running evolution cycle.", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  }, [agents, currentGen, environment, behavior, portfolio]);

  const handleRegimeChange = useCallback(async (regime: EnvironmentState["regime"]) => {
    const newEnv: EnvironmentState = {
      regime,
      volatility: regime === "risk-off" ? "high" : regime === "choppy" ? "medium" : "low",
      earningsActive: environment.earningsActive,
      macroEvent: environment.macroEvent,
      sentiment: regime === "risk-on" ? 0.65 : regime === "risk-off" ? -0.42 : regime === "trending" ? 0.34 : 0.05,
    };
    setEnvironment(newEnv);
    await updateEnvironment(newEnv).catch(console.error);
  }, [environment]);

  const handleOverride = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("update-behavior", {
        body: { overrideAction: "manual trade intervention — user overrode system position" },
      });
      if (error) throw error;
      if (data) {
        setBehavior({
          riskTolerance: Number(data.risk_tolerance),
          drawdownSensitivity: Number(data.drawdown_sensitivity),
          earningsAvoidance: Number(data.earnings_avoidance),
          momentumBias: Number(data.momentum_bias),
          holdingPatience: Number(data.holding_patience),
        });
        if (data.insight) {
          toast({ title: "Behavioral Update", description: data.insight });
        }
      }
    } catch (err) {
      console.error("Behavior update failed:", err);
      toast({ title: "Override Failed", description: "Could not update behavioral genome.", variant: "destructive" });
    }
  }, []);

  const handleCloseTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem("apex-tour-seen", "true");
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">Loading population from database...</p>
        </div>
      </div>
    );
  }

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
              <span>DB Persisted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6 space-y-6">
        <GenerationControls
          currentGeneration={currentGen}
          isRunning={isRunning}
          onRunGeneration={runGeneration}
          activeCount={activeAgents.length}
          extinctCount={extinctAgents.length}
          onShowTour={() => setShowTour(true)}
        />

        {/* Portfolio + Allocation row */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <PortfolioWidget portfolio={portfolio} isRunning={isRunning} />
          </div>
          <div className="col-span-12 md:col-span-8">
            <StrategyAllocation agents={agents} totalCapital={portfolio.capital} />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {agents.slice(0, 40).map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <GenerationChart data={genHistory} />
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <SpeciesMap agents={agents} />
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-4">
            <PerformanceLeaderboard agents={agents} />

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

      <GuidedTour isOpen={showTour} onClose={handleCloseTour} />
    </div>
  );
}
