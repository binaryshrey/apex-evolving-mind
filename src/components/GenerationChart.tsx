import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

interface GenerationChartProps {
  data: { gen: number; avgFitness: number; topFitness: number; population: number; diversity: number }[];
}

export default function GenerationChart({ data }: GenerationChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Evolution Progress
      </h3>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gradientTop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 100% 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(160 100% 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(195 100% 50%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(195 100% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="gen"
              tick={{ fill: "hsl(215 12% 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              tickFormatter={(v) => `G${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(215 12% 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220 18% 7%)",
                border: "1px solid hsl(220 16% 14%)",
                borderRadius: "8px",
                fontSize: "11px",
                fontFamily: "JetBrains Mono",
              }}
            />
            <Area
              type="monotone"
              dataKey="topFitness"
              stroke="hsl(160 100% 45%)"
              fill="url(#gradientTop)"
              strokeWidth={2}
              name="Top Fitness"
            />
            <Area
              type="monotone"
              dataKey="avgFitness"
              stroke="hsl(195 100% 50%)"
              fill="url(#gradientAvg)"
              strokeWidth={2}
              name="Avg Fitness"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px] text-muted-foreground">Top Fitness</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent" />
          <span className="text-[10px] text-muted-foreground">Avg Fitness</span>
        </div>
      </div>
    </motion.div>
  );
}
