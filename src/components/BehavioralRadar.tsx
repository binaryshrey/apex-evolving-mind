import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { BehavioralGenome } from "@/data/types";
import { motion } from "framer-motion";

interface BehavioralRadarProps {
  genome: BehavioralGenome;
}

const labels: Record<keyof BehavioralGenome, string> = {
  riskTolerance: "Risk Tolerance",
  drawdownSensitivity: "DD Sensitivity",
  earningsAvoidance: "Earnings Avoid",
  momentumBias: "Momentum Bias",
  holdingPatience: "Holding Patience",
};

export default function BehavioralRadar({ genome }: BehavioralRadarProps) {
  const data = Object.entries(genome).map(([key, value]) => ({
    subject: labels[key as keyof BehavioralGenome],
    value: Math.round(value * 100),
    fullMark: 100,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Behavioral DNA
      </h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(220 16% 14%)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "hsl(215 12% 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Behavioral"
              dataKey="value"
              stroke="hsl(195 100% 50%)"
              fill="hsl(195 100% 50%)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(genome).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {labels[key as keyof BehavioralGenome]}
            </span>
            <span className="font-mono text-xs text-accent">{(value * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
