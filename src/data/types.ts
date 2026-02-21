export interface AgentGenome {
  id: string;
  name: string;
  generation: number;
  fitness: number;
  status: "active" | "extinct" | "breeding" | "newborn";
  archetype: "momentum" | "defensive" | "volatility" | "mean-reversion" | "hybrid";
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  totalReturn: number;
  trades: number;
  parentIds?: string[];
  genome: {
    entryLogic: number;
    exitDiscipline: number;
    riskTolerance: number;
    positionSizing: number;
    indicatorWeight: number;
  };
}

export interface PostMortem {
  id: string;
  agentId: string;
  agentName: string;
  generation: number;
  cause: string;
  inheritedBy: string[];
  timestamp: Date;
  fitnessAtDeath: number;
}

export interface EnvironmentState {
  regime: "trending" | "choppy" | "risk-off" | "risk-on";
  volatility: "low" | "medium" | "high";
  earningsActive: boolean;
  macroEvent: boolean;
  sentiment: number;
}

export interface BehavioralGenome {
  riskTolerance: number;
  drawdownSensitivity: number;
  earningsAvoidance: number;
  momentumBias: number;
  holdingPatience: number;
}

export interface TradeRecord {
  id: number;
  agentId: string;
  agentName: string;
  generation: number;
  action: "buy" | "sell" | "hold";
  asset: string;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  rationale: string | null;
  createdAt: string;
}

export interface MarketSnapshot {
  id: number;
  source: string;
  data: {
    crypto?: Record<string, { usd: number; usd_24h_change: number; usd_24h_vol: number; usd_market_cap: number }>;
    fearGreed?: { value: string; value_classification: string };
    regime?: string;
    sentiment?: number;
    marketMood?: string;
    newsHeadlines?: string[];
    rationale?: string;
    timestamp?: string;
  };
  createdAt: string;
}
