import { supabase } from "@/integrations/supabase/client";
import { AgentGenome, PostMortem, EnvironmentState, BehavioralGenome } from "@/data/types";

// ─── Agent CRUD ───

export async function fetchAgents(): Promise<AgentGenome[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data || []).map(dbToAgent);
}

export async function upsertAgents(agents: AgentGenome[]): Promise<void> {
  const rows = agents.map(agentToDb);
  const { error } = await supabase.from("agents").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function insertAgents(agents: AgentGenome[]): Promise<void> {
  const rows = agents.map(agentToDb);
  const { error } = await supabase.from("agents").insert(rows);
  if (error) throw error;
}

export async function updateAgentStatus(id: string, status: AgentGenome["status"]): Promise<void> {
  const { error } = await supabase.from("agents").update({ status }).eq("id", id);
  if (error) throw error;
}

// ─── Generations ───

export async function fetchGenerations() {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .order("gen");
  if (error) throw error;
  return (data || []).map((g: any) => ({
    gen: g.gen,
    avgFitness: Number(g.avg_fitness),
    topFitness: Number(g.top_fitness),
    population: g.population,
    diversity: Number(g.diversity),
  }));
}

export async function insertGeneration(gen: { gen: number; avgFitness: number; topFitness: number; population: number; diversity: number }) {
  const { error } = await supabase.from("generations").insert({
    gen: gen.gen,
    avg_fitness: gen.avgFitness,
    top_fitness: gen.topFitness,
    population: gen.population,
    diversity: gen.diversity,
  });
  if (error) throw error;
}

// ─── Post-Mortems ───

export async function fetchPostMortems(): Promise<PostMortem[]> {
  const { data, error } = await supabase
    .from("post_mortems")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []).map((pm: any) => ({
    id: pm.id,
    agentId: pm.agent_id,
    agentName: pm.agent_name,
    generation: pm.generation,
    cause: pm.cause,
    inheritedBy: pm.inherited_by || [],
    timestamp: new Date(pm.created_at),
    fitnessAtDeath: Number(pm.fitness_at_death),
  }));
}

export async function insertPostMortems(pms: PostMortem[]): Promise<void> {
  const rows = pms.map((pm) => ({
    id: pm.id,
    agent_id: pm.agentId,
    agent_name: pm.agentName,
    generation: pm.generation,
    cause: pm.cause,
    inherited_by: pm.inheritedBy,
    fitness_at_death: pm.fitnessAtDeath,
  }));
  const { error } = await supabase.from("post_mortems").insert(rows);
  if (error) throw error;
}

// ─── Environment ───

export async function fetchEnvironment(): Promise<EnvironmentState> {
  const { data, error } = await supabase
    .from("environment_state")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return {
    regime: data.regime as EnvironmentState["regime"],
    volatility: data.volatility as EnvironmentState["volatility"],
    earningsActive: data.earnings_active,
    macroEvent: data.macro_event,
    sentiment: Number(data.sentiment),
  };
}

export async function updateEnvironment(env: Partial<EnvironmentState>): Promise<void> {
  const row: any = {};
  if (env.regime !== undefined) row.regime = env.regime;
  if (env.volatility !== undefined) row.volatility = env.volatility;
  if (env.earningsActive !== undefined) row.earnings_active = env.earningsActive;
  if (env.macroEvent !== undefined) row.macro_event = env.macroEvent;
  if (env.sentiment !== undefined) row.sentiment = env.sentiment;
  const { error } = await supabase.from("environment_state").update(row).eq("id", 1);
  if (error) throw error;
}

// ─── Behavioral Genome ───

export async function fetchBehavioralGenome(): Promise<BehavioralGenome> {
  const { data, error } = await supabase
    .from("behavioral_genome")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return {
    riskTolerance: Number(data.risk_tolerance),
    drawdownSensitivity: Number(data.drawdown_sensitivity),
    earningsAvoidance: Number(data.earnings_avoidance),
    momentumBias: Number(data.momentum_bias),
    holdingPatience: Number(data.holding_patience),
  };
}

// ─── Helpers ───

function dbToAgent(row: any): AgentGenome {
  return {
    id: row.id,
    name: row.name,
    generation: row.generation,
    fitness: Number(row.fitness),
    status: row.status,
    archetype: row.archetype,
    sharpe: Number(row.sharpe),
    maxDrawdown: Number(row.max_drawdown),
    winRate: Number(row.win_rate),
    totalReturn: Number(row.total_return),
    trades: row.trades,
    parentIds: row.parent_ids || undefined,
    genome: {
      entryLogic: Number(row.genome_entry_logic),
      exitDiscipline: Number(row.genome_exit_discipline),
      riskTolerance: Number(row.genome_risk_tolerance),
      positionSizing: Number(row.genome_position_sizing),
      indicatorWeight: Number(row.genome_indicator_weight),
    },
  };
}

function agentToDb(a: AgentGenome) {
  return {
    id: a.id,
    name: a.name,
    generation: a.generation,
    fitness: a.fitness,
    status: a.status,
    archetype: a.archetype,
    sharpe: a.sharpe,
    max_drawdown: a.maxDrawdown,
    win_rate: a.winRate,
    total_return: a.totalReturn,
    trades: a.trades,
    parent_ids: a.parentIds || null,
    genome_entry_logic: a.genome.entryLogic,
    genome_exit_discipline: a.genome.exitDiscipline,
    genome_risk_tolerance: a.genome.riskTolerance,
    genome_position_sizing: a.genome.positionSizing,
    genome_indicator_weight: a.genome.indicatorWeight,
  };
}
