import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgentGenome, EnvironmentState, PostMortem, BehavioralGenome, TradeRecord, MarketSnapshot } from "@/data/types";
import { callAiriaEvolve } from "@/lib/airiaClient";
import {
  fetchAgents, upsertAgents, insertAgents,
  fetchGenerations, insertGeneration,
  fetchPostMortems, insertPostMortems,
  fetchEnvironment, updateEnvironment,
  fetchBehavioralGenome,
  fetchPortfolio, insertPortfolioSnapshot,
  fetchTradeHistory, insertTrades,
  fetchLatestMarketSnapshot,
} from "@/lib/dbClient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AgentCard from "@/components/AgentCard";
import PostMortemFeed from "@/components/PostMortemFeed";
import BehavioralRadar from "@/components/BehavioralRadar";
import GenerationChart from "@/components/GenerationChart";

import EnvironmentPanel from "@/components/EnvironmentPanel";
import GenerationControls from "@/components/GenerationControls";
import GenerationSummaryModal from "@/components/GenerationSummaryModal";
import PortfolioWidget, { PortfolioState } from "@/components/PortfolioWidget";
import PerformanceLeaderboard from "@/components/PerformanceLeaderboard";
import StrategyAllocation from "@/components/StrategyAllocation";
import GuidedTour from "@/components/GuidedTour";
import MarketContextPanel from "@/components/MarketContextPanel";
import TradeHistoryLog from "@/components/TradeHistoryLog";
import RiskMetricsDashboard from "@/components/RiskMetricsDashboard";
import AlpacaPaperPanel from "@/components/AlpacaPaperPanel";
import MacroDataPanel from "@/components/MacroDataPanel";
import { Dna, Activity, Brain, Loader2 } from "lucide-react";

// ─── Types for generation summary ───
interface GenSummary {
  generation: number;
  culled: { id: string; name: string; fitness: number; cause: string; inheritedBy: string[] }[];
  born: { id: string; name: string; fitness: number; parentIds: string[] }[];
  avgFitnessBefore: number;
  avgFitnessAfter: number;
  topFitness: number;
  capitalBefore: number;
  capitalAfter: number;
}

export default function Index() {
  const [agentFilter, setAgentFilter] = useState<"all" | "newborn" | "active" | "breeding" | "extinct">("all");
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
  const [generationSummary, setGenerationSummary] = useState<GenSummary | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentState>({
    regime: "trending", volatility: "medium", earningsActive: false, macroEvent: false, sentiment: 0.34,
  });
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot | null>(null);
  const [isMarketLoading, setIsMarketLoading] = useState(false);
  const [showExtinct, setShowExtinct] = useState(false);
  const INITIAL_VISIBLE = 12;

  // ─── Load all data from DB on mount ───
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [dbAgents, dbGens, dbPMs, dbEnv, dbBehavior, dbPortfolio, dbTrades, dbMarket] = await Promise.all([
          fetchAgents(),
          fetchGenerations(),
          fetchPostMortems(),
          fetchEnvironment(),
          fetchBehavioralGenome(),
          fetchPortfolio().catch(() => ({ capital: 100000, pnl: 0, pnlPercent: 0, generation: 0 })),
          fetchTradeHistory().catch(() => []),
          fetchLatestMarketSnapshot().catch(() => null),
        ]);

        if (dbAgents.length > 0) {
          setAgents(dbAgents);
          setGenHistory(dbGens);
          setPostMortems(dbPMs);
          setEnvironment(dbEnv);
          setBehavior(dbBehavior);
          setPortfolio(dbPortfolio);
          setTrades(dbTrades);
          setMarketSnapshot(dbMarket);
          setCurrentGen(dbGens.length > 0 ? Math.max(...dbGens.map(g => g.gen)) : 0);
          
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

        // Fetch live market data
        refreshMarketData();

      } catch (err) {
        console.error("Failed to load data:", err);
        toast({ title: "Error", description: "Failed to load data from database.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const refreshMarketData = useCallback(async () => {
    setIsMarketLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-market-data");
      if (error) throw error;
      if (data?.regime) {
        const freshEnv = await fetchEnvironment();
        setEnvironment(freshEnv);
        const freshSnap = await fetchLatestMarketSnapshot();
        setMarketSnapshot(freshSnap);
        toast({ title: "Market Scan", description: data.rationale || `Regime: ${data.regime}` });
      }
    } catch (err) {
      console.error("Market data error:", err);
    } finally {
      setIsMarketLoading(false);
    }
  }, []);

  const activeAgents = useMemo(() => agents.filter((a) => a.status !== "extinct"), [agents]);
  const extinctAgents = useMemo(() => agents.filter((a) => a.status === "extinct"), [agents]);

  // ─── Generate environment & behavior-aware trades for agents ───
  const generateTrades = useCallback((
    activeAgents: AgentGenome[],
    gen: number,
    cryptoData: any,
    env: EnvironmentState,
    beh: BehavioralGenome
  ): Omit<TradeRecord, "id" | "createdAt">[] => {
    const assets = ["BTC", "ETH", "SOL", "ADA", "AVAX"];
    const cryptoKeys: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana", ADA: "cardano", AVAX: "avalanche-2" };

    // Environment regime biases: how much the regime favors buying vs selling
    const regimeBuyBias: Record<string, number> = {
      "risk-on": 0.35,    // strongly favors buying
      "trending": 0.2,    // moderately favors buying
      "choppy": -0.1,     // slightly favors selling/holding
      "risk-off": -0.35,  // strongly favors selling
    };
    const buyBias = regimeBuyBias[env.regime] || 0;

    // Volatility affects position sizing
    const volMultiplier = env.volatility === "high" ? 0.5 : env.volatility === "medium" ? 0.8 : 1.0;

    // Sentiment adds directional pressure (-1 to 1)
    const sentimentPressure = env.sentiment * 0.15;

    return activeAgents.slice(0, 10).map((agent) => {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      const basePrice = cryptoData?.[cryptoKeys[asset]]?.usd || (asset === "BTC" ? 60000 : asset === "ETH" ? 3000 : 100);

      // ─── Decision score: combines genome, environment, and behavioral DNA ───
      // Agent's intrinsic tendency
      let score = (agent.genome.entryLogic - 0.5) * 0.4; // genome entry logic
      score += (0.5 - agent.genome.exitDiscipline) * 0.2; // high exit discipline → more likely to sell

      // Environment influence
      score += buyBias;
      score += sentimentPressure;

      // Behavioral DNA influence
      score += (beh.riskTolerance - 0.5) * 0.2;     // high risk tolerance → more buying
      score += (beh.momentumBias - 0.5) * 0.15;      // high momentum bias → follow trend (buy in trending)
      score -= (beh.drawdownSensitivity - 0.5) * 0.1; // high drawdown sensitivity → more cautious

      // Archetype-environment interaction
      if (agent.archetype === "momentum" && (env.regime === "trending" || env.regime === "risk-on")) {
        score += 0.15; // momentum thrives in trends
      } else if (agent.archetype === "defensive" && env.regime === "risk-off") {
        score -= 0.2; // defensive agents sell in risk-off
      } else if (agent.archetype === "mean-reversion" && env.regime === "choppy") {
        score += 0.1; // mean-reversion loves choppy markets
      } else if (agent.archetype === "volatility" && env.volatility === "high") {
        score += 0.12; // vol traders thrive in high vol
      }

      // Earnings avoidance: if earnings are active and user avoids them, bias toward hold
      if (env.earningsActive && beh.earningsAvoidance > 0.6) {
        score *= 0.3; // dramatically reduce conviction
      }

      // Holding patience: high patience → less likely to sell
      if (score < 0 && beh.holdingPatience > 0.65) {
        score *= (1 - beh.holdingPatience * 0.4); // dampen sell signal
      }

      // Determine action from composite score
      const action: "buy" | "sell" | "hold" = score > 0.1 ? "buy" : score < -0.1 ? "sell" : "hold";

      // Position sizing influenced by behavioral risk tolerance, volatility, and agent genome
      const rawSize = agent.genome.positionSizing * beh.riskTolerance * volMultiplier;
      const quantity = Math.round(Math.max(0.01, rawSize * 10) * 100) / 100;

      // ─── Realistic P&L simulation ───
      // Use Box-Muller transform for normally distributed returns (mean=0, std=1)
      const u1 = Math.random();
      const u2 = Math.random();
      const normalRandom = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);

      // Base volatility per asset class (realistic daily move %)
      const assetVolatility: Record<string, number> = {
        BTC: 0.035, ETH: 0.045, SOL: 0.06, ADA: 0.065, AVAX: 0.055, DOT: 0.055,
      };
      const baseVol = assetVolatility[asset] || 0.04;

      // Environment amplifies/dampens volatility
      const envVolScale = env.volatility === "high" ? 1.8 : env.volatility === "medium" ? 1.2 : 0.8;

      // Slight edge for well-aligned agents (fitness & environment match)
      // But this edge is SMALL — max ~2% bias, not guaranteed profit
      const alignmentEdge = action === "buy" && buyBias > 0 ? 0.02 : action === "sell" && buyBias < 0 ? 0.02 : -0.01;
      const fitnessEdge = ((agent.fitness - 80) / 100) * 0.01; // top agents get ~0.1-0.3% edge

      // Final return: normally distributed with slight skill edge
      const returnPct = normalRandom * baseVol * envVolScale + alignmentEdge + fitnessEdge;

      // P&L from return percentage — can be significantly negative
      const directionMultiplier = action === "sell" ? -1 : 1; // sells profit from price drops
      const pnl = Math.round(basePrice * rawSize * returnPct * directionMultiplier * 100) / 100;

      // Build detailed rationale
      const regimeNote = `${env.regime} regime (vol: ${env.volatility}, sentiment: ${env.sentiment > 0 ? "+" : ""}${env.sentiment.toFixed(2)})`;
      const behaviorNote = score > 0.1
        ? `risk tolerance ${(beh.riskTolerance * 100).toFixed(0)}% supports entry`
        : score < -0.1
        ? `drawdown sensitivity ${(beh.drawdownSensitivity * 100).toFixed(0)}% triggers exit`
        : `holding patience ${(beh.holdingPatience * 100).toFixed(0)}% favors wait`;
      const rationale = `${agent.archetype} strategy in ${regimeNote}. ${behaviorNote}. Score: ${score.toFixed(2)}`;

      return {
        agentId: agent.id,
        agentName: agent.name,
        generation: gen,
        action,
        asset,
        entryPrice: Math.round(basePrice * 100) / 100,
        exitPrice: action !== "hold" ? Math.round((basePrice + pnl) * 100) / 100 : null,
        quantity,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round((pnl / basePrice) * 10000) / 100,
        rationale,
      };
    });
  }, []);

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

      // Generate trades using live market prices
      const newTrades = generateTrades(activeNext, currentGen + 1, marketSnapshot?.data?.crypto, environment, behavior);

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
        insertTrades(newTrades).catch(console.error),
      ]);

      // Execute top agent trades on Alpaca paper account using stock ETFs
      const cryptoToEtf: Record<string, string> = {
        BTC: "BITO", ETH: "ETHA", SOL: "SPY", ADA: "QQQ", AVAX: "IWM",
      };
      const alpacaTrades = newTrades
        .filter(t => t.action !== "hold")
        .slice(0, 5)
        .map(t => ({
          symbol: cryptoToEtf[t.asset] || "SPY",
          qty: Math.max(1, Math.round(t.quantity)),
          side: t.action,
          agentId: t.agentId,
          agentName: t.agentName,
          generation: t.generation,
          rationale: t.rationale,
        }));

      if (alpacaTrades.length > 0) {
        try {
          const { data, error } = await supabase.functions.invoke("alpaca-trade", {
            body: { action: "execute", trades: alpacaTrades },
          });
          if (error) {
            console.error("Alpaca execute error:", error);
          } else {
            const submitted = data?.results?.filter((r: any) => r.status === "submitted")?.length || 0;
            const errors = data?.results?.filter((r: any) => r.status === "error") || [];
            if (submitted > 0) {
              toast({ title: "Alpaca Trades", description: `${submitted} paper trades submitted to Alpaca.` });
            }
            if (errors.length > 0) {
              console.warn("Alpaca trade errors:", errors);
            }
          }
        } catch (e) {
          console.error("Alpaca execute failed:", e);
        }
      }

      setPortfolio({ capital: newCapital, pnl: totalPnl, pnlPercent: Math.round(totalPnlPercent * 100) / 100, generation: currentGen + 1 });

      // Refresh trades from DB
      fetchTradeHistory().then(setTrades).catch(console.error);

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
  }, [agents, currentGen, environment, behavior, portfolio, marketSnapshot, generateTrades]);

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

        {/* Alpaca Paper Trading + Allocation row */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4">
            <AlpacaPaperPanel portfolio={portfolio} />
          </div>
          <div className="col-span-12 md:col-span-8">
            <StrategyAllocation agents={agents} totalCapital={portfolio.capital} environment={environment} behavioralDna={behavior} />
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

              {/* Status filter */}
              <div className="flex gap-1 flex-wrap">
                {(["all", "newborn", "active", "breeding", "extinct"] as const).map((f) => {
                  const count = f === "all" ? agents.length : agents.filter(a => a.status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setAgentFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-colors border ${
                        agentFilter === f
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-secondary text-muted-foreground border-transparent hover:text-foreground"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>

              {(() => {
                const sorted = [...agents]
                  .sort((a, b) => {
                    const order = { newborn: 0, breeding: 1, active: 2, extinct: 3 };
                    const diff = order[a.status] - order[b.status];
                    if (diff !== 0) return diff;
                    return b.generation - a.generation || b.fitness - a.fitness;
                  })
                  .filter(a => agentFilter === "all" || a.status === agentFilter);
                
                const visible = showExtinct ? sorted : sorted.slice(0, INITIAL_VISIBLE);
                const hiddenCount = sorted.length - INITIAL_VISIBLE;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <AnimatePresence mode="popLayout">
                        {visible.map((agent) => (
                          <AgentCard key={agent.id} agent={agent} />
                        ))}
                      </AnimatePresence>
                    </div>
                    {!showExtinct && hiddenCount > 0 && (
                      <button
                        onClick={() => setShowExtinct(true)}
                        className="mt-3 w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-xs font-mono font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Load {hiddenCount} more agents (including extinct)
                      </button>
                    )}
                    {showExtinct && sorted.length > INITIAL_VISIBLE && (
                      <button
                        onClick={() => setShowExtinct(false)}
                        className="mt-3 w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-xs font-mono font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Show less
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <GenerationChart data={genHistory} />
            </div>

            {/* Trade History */}
            <TradeHistoryLog trades={trades} />
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Live Market Context */}
            <MarketContextPanel
              snapshot={marketSnapshot}
              isLoading={isMarketLoading}
              onRefresh={refreshMarketData}
            />

            {/* Risk Metrics */}
            <RiskMetricsDashboard
              agents={agents}
              portfolio={portfolio}
              genHistory={genHistory}
            />


            {/* FRED Macro & Equities */}
            <MacroDataPanel />

            <PerformanceLeaderboard agents={agents} />

            <div className="rounded-xl border border-border bg-card p-4">
              <EnvironmentPanel environment={environment} onRegimeChange={handleRegimeChange} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <BehavioralRadar genome={behavior} onUpdate={setBehavior} />
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
