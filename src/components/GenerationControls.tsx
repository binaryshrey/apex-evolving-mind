import { motion } from "framer-motion";
import { Play, Zap, SkipForward, HelpCircle } from "lucide-react";

interface GenerationControlsProps {
  currentGeneration: number;
  isRunning: boolean;
  onRunGeneration: () => void;
  activeCount: number;
  extinctCount: number;
  onShowTour?: () => void;
}

export default function GenerationControls({
  currentGeneration,
  isRunning,
  onRunGeneration,
  activeCount,
  extinctCount,
  onShowTour,
}: GenerationControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Generation</div>
          <div className="text-2xl font-mono font-bold text-primary text-glow-green">{currentGeneration}</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Active</div>
          <div className="text-lg font-mono font-semibold text-foreground">{activeCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Extinct</div>
          <div className="text-lg font-mono font-semibold text-destructive">{extinctCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onShowTour && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onShowTour}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            How it works
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRunGeneration}
          disabled={isRunning}
          className={`
            flex items-center gap-2 rounded-lg px-5 py-2.5 font-mono text-sm font-semibold transition-all
            ${isRunning
              ? "bg-primary/20 text-primary/50 cursor-wait"
              : "bg-primary text-primary-foreground glow-green hover:brightness-110"
            }
          `}
        >
          {isRunning ? (
            <>
              <Zap className="h-4 w-4 animate-pulse-green" />
              Evolving...
            </>
          ) : (
            <>
              <SkipForward className="h-4 w-4" />
              Run Generation
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
