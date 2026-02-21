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
  sentiment: number; // -1 to 1
}

export interface BehavioralGenome {
  riskTolerance: number;
  drawdownSensitivity: number;
  earningsAvoidance: number;
  momentumBias: number;
  holdingPatience: number;
}
