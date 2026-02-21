import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export interface PortfolioState {
  capital: number;
  pnl: number;
  pnlPercent: number;
  generation: number;
}

interface PortfolioWidgetProps {
  portfolio: PortfolioState;
  isRunning: boolean;
}

export default function PortfolioWidget({ portfolio, isRunning }: PortfolioWidgetProps) {
  const isPositive = portfolio.pnl >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="h-4 w-4 text-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Simulated Portfolio
        </h3>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Capital</div>
          <motion.div
            key={portfolio.capital}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-2xl font-mono font-bold text-foreground"
          >
            <DollarSign className="inline h-5 w-5 text-muted-foreground" />
            {portfolio.capital.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </motion.div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Unrealized P&L</div>
          <div className={`text-lg font-mono font-bold flex items-center gap-1 ${isPositive ? "text-primary" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositive ? "+" : ""}{portfolio.pnlPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Capital bar */}
      <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max((portfolio.capital / 150000) * 100, 5), 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${isPositive ? "bg-primary/60" : "bg-destructive/60"}`}
        />
        {/* Starting capital marker */}
        <div
          className="absolute top-0 h-full w-px bg-muted-foreground/50"
          style={{ left: `${(100000 / 150000) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] font-mono text-muted-foreground">$0</span>
        <span className="text-[8px] font-mono text-muted-foreground">$100K start</span>
        <span className="text-[8px] font-mono text-muted-foreground">$150K</span>
      </div>

      {isRunning && (
        <div className="mt-2 text-center text-[10px] font-mono text-accent animate-pulse">
          Agents trading...
        </div>
      )}
    </div>
  );
}
