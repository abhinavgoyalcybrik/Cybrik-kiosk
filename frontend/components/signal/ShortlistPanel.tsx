import type { KioskRecommendation } from "@/lib/kiosk/types";
import { getHandoffCopy } from "@/lib/signal/portal";

export function ShortlistPanel({
  source,
  recommendations,
  onOpenMatches,
}: {
  source: "live_catalog" | "demo_catalog";
  recommendations: KioskRecommendation[];
  onOpenMatches: () => void;
}) {
  const count = recommendations.length;
  const handoffCopy = getHandoffCopy(source);

  return (
    <section className="portal-shortlist-panel">
      <div className="portal-shortlist-heading">
        <div>
          <p className="portal-section-kicker">YOUR SHORTLIST</p>
          <h2>{count} saved program{count === 1 ? "" : "s"}</h2>
        </div>
        <button className="portal-text-button" onClick={onOpenMatches} type="button">
          Browse matches <span aria-hidden="true">→</span>
        </button>
      </div>

      {count > 0 ? (
        <div className="portal-shortlist-programs">
          {recommendations.map((recommendation, index) => (
            <article key={recommendation.id}>
              <span>0{index + 1}</span>
              <div>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.university} · {recommendation.country}</p>
              </div>
              <strong>{recommendation.score}%</strong>
            </article>
          ))}
        </div>
      ) : (
        <div className="portal-empty-state">
          <span aria-hidden="true">◎</span>
          <h3>Nothing saved yet.</h3>
          <p>Compare matches, then keep your strongest routes here.</p>
        </div>
      )}

      <div className="portal-handoff-card">
        <div>
          <span className="portal-handoff-icon" aria-hidden="true">↗</span>
          <div>
            <p>{handoffCopy}</p>
            <small>Demo mode. Advisor handoff stays preview-only.</small>
          </div>
        </div>
        <button type="button">Review handoff</button>
      </div>
    </section>
  );
}
