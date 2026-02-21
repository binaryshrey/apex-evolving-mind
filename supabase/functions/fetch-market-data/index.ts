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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Lovable AI to analyze current market conditions
    // This acts as the "Environmental Scanner" agent
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
            content: `You are a market regime classifier. Based on your knowledge of current global financial markets (as of your training data), classify the current market environment.

Respond ONLY with this JSON:
{
  "regime": "trending"|"choppy"|"risk-off"|"risk-on",
  "volatility": "low"|"medium"|"high",
  "earningsActive": boolean (true if major earnings season is likely active),
  "macroEvent": boolean (true if significant macro events are occurring),
  "sentiment": number between -1 and 1 (market sentiment score),
  "rationale": "1-2 sentence explanation of classification"
}`
          },
          {
            role: "user",
            content: `Classify the current global market environment. Consider: major index trends, VIX levels, Fed policy stance, geopolitical risks, earnings calendar. Today is ${new Date().toISOString().split("T")[0]}. Return ONLY JSON.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (objMatch) content = objMatch[0];

    const env = JSON.parse(content);
    console.log("Market classification:", env);

    // Update environment state in DB
    const { error: updateErr } = await supabase.from("environment_state").update({
      regime: env.regime,
      volatility: env.volatility,
      earnings_active: env.earningsActive,
      macro_event: env.macroEvent,
      sentiment: env.sentiment,
    }).eq("id", 1);

    if (updateErr) throw new Error(`Update error: ${updateErr.message}`);

    return new Response(JSON.stringify({ ...env, source: "ai-classified" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Market data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
