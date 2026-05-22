import { motion } from "framer-motion";

type MatchScoreMeterProps = {
  score: number;
};

export default function MatchScoreMeter({
  score,
}: MatchScoreMeterProps) {
  const getGradient = () => {
    if (score >= 80) return "linear-gradient(90deg, #10b981 0%, #34d399 100%)";
    if (score >= 65) return "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)";
    return "linear-gradient(90deg, #ef4444 0%, #f87171 100%)";
  };

  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Profile Match Accuracy
        </span>

        <span className="text-sm font-black text-slate-800 tabular-nums">
          {score}%
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: getGradient() }}
        />
      </div>
    </div>
  );
}