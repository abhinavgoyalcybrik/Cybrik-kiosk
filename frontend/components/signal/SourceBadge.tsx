export function SourceBadge({
  source,
}: {
  source: "live_catalog" | "demo_catalog";
}) {
  const live = source === "live_catalog";
  return (
    <span className={`signal-source ${live ? "is-live" : "is-demo"}`}>
      <span aria-hidden="true" className="signal-source-dot" />
      {live ? "Live catalog" : "Demo catalog"}
    </span>
  );
}
