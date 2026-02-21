import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const requestedCount = Math.min(Math.max(Number(body.count) || 40, 10), 100);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if agents already exist
    const { count } = await supabase.from("agents").select("*", { count: "exact", head: true });
    if (count && count > 0) {
      return new Response(JSON.stringify({ message: "Population already exists", count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI to generate 40 unique trading strategy agents
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a quantitative finance expert. Generate exactly ${requestedCount} unique trading strategy agent configurations. Each agent represents a different algorithmic trading approach. Be creative with names and realistic with parameters.

Respond ONLY with a JSON array of ${requestedCount} objects, each with:
{
  "id": "AGT-001" through "AGT-${String(requestedCount).padStart(3, "0")}",
  "name": "Creative strategy name (2-3 words)",
  "archetype": one of "momentum"|"defensive"|"volatility"|"mean-reversion"|"hybrid",
  "fitness": realistic starting fitness 20-85,
  "sharpe": realistic Sharpe ratio -0.5 to 3.0,
  "maxDrawdown": realistic max drawdown 2-25%,
  "winRate": realistic win rate 35-75%,
  "totalReturn": realistic return -15 to 40%,
  "genome": {
    "entryLogic": 0-1 (how selective entry signals are),
    "exitDiscipline": 0-1 (how strict exit rules are),
    "riskTolerance": 0-1 (how much risk is accepted),
    "positionSizing": 0-1 (how aggressive position sizes are),
    "indicatorWeight": 0-1 (reliance on technical indicators)
  }
}

Make the archetypes distribution roughly balanced across the 5 types.
Ensure diversity in fitness scores and genome traits. Higher fitness agents should have more balanced genomes.`
          },
          {
            role: "user",
            content: `Generate ${requestedCount} trading strategy agents now. Return ONLY the JSON array, no markdown.`
          }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from possible markdown
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();
    
    // Try to find array
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (arrMatch) content = arrMatch[0];

    const agents = JSON.parse(content);
    console.log(`Generated ${agents.length} agents from AI`);

    // Insert agents into database
    const rows = agents.map((a: any, i: number) => ({
      id: a.id || `AGT-${String(i + 1).padStart(3, "0")}`,
      name: a.name,
      generation: 0,
      fitness: a.fitness,
      status: "active",
      archetype: a.archetype,
      sharpe: a.sharpe,
      max_drawdown: a.maxDrawdown,
      win_rate: a.winRate,
      total_return: a.totalReturn,
      trades: Math.floor(Math.random() * 50 + 10),
      genome_entry_logic: a.genome.entryLogic,
      genome_exit_discipline: a.genome.exitDiscipline,
      genome_risk_tolerance: a.genome.riskTolerance,
      genome_position_sizing: a.genome.positionSizing,
      genome_indicator_weight: a.genome.indicatorWeight,
    }));

    const { error: insertErr } = await supabase.from("agents").insert(rows);
    if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);

    // Seed generation 0 stats
    const avgFitness = rows.reduce((s: number, a: any) => s + a.fitness, 0) / rows.length;
    const topFitness = Math.max(...rows.map((a: any) => a.fitness));
    
    await supabase.from("generations").insert({
      gen: 0,
      avg_fitness: Math.round(avgFitness * 10) / 10,
      top_fitness: Math.round(topFitness * 10) / 10,
      population: rows.length,
      diversity: 0.92,
    });

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Population generation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
