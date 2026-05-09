type MatchScoreMeterProps = {
  score: number;
};

export default function MatchScoreMeter({
  score,
}: MatchScoreMeterProps) {
  const getColor = () => {
    if (score >= 80) return "bg-green-500";
    if (score >= 65) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          Match Score
        </span>

        <span className="text-sm font-bold text-slate-900">
          {score}/100
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}