export function PathSignal({
  percent,
  label,
  tone = "lime",
}: {
  percent: number;
  label: string;
  tone?: "lime" | "violet" | "ice";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      aria-label={`${label}: ${clamped}% complete`}
      className={`signal-path signal-path-${tone}`}
      role="img"
    >
      <span className="signal-path-track" aria-hidden="true">
        <span className="signal-path-fill" style={{ width: `${clamped}%` }} />
      </span>
      <span className="signal-path-endpoint" aria-hidden="true" />
      <span className="signal-path-value">{clamped}%</span>
    </div>
  );
}
