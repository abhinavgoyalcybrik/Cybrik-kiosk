import type { KioskRecommendation } from "@/lib/kiosk/types";

export function MatchCard({
  recommendation,
  selected,
  shortlisted,
  onSelect,
  onToggleShortlist,
}: {
  recommendation: KioskRecommendation;
  selected: boolean;
  shortlisted: boolean;
  onSelect: () => void;
  onToggleShortlist: () => void;
}) {
  return (
    <article className={`portal-match-card ${selected ? "is-selected" : ""}`}>
      <div className="portal-match-card-topline">
        <span>{recommendation.country}</span>
        <strong>{recommendation.score}% fit</strong>
      </div>
      <button className="portal-match-title" type="button" onClick={onSelect}>
        <span>{recommendation.title}</span>
        <small>{recommendation.university}</small>
      </button>
      <p>{recommendation.location}</p>
      <dl className="portal-match-meta">
        <div>
          <dt>Tuition</dt>
          <dd>{recommendation.tuitionLabel}</dd>
        </div>
        <div>
          <dt>Intake</dt>
          <dd>{recommendation.intakeLabel}</dd>
        </div>
      </dl>
      <div className="portal-match-actions">
        <button className="portal-text-button" onClick={onSelect} type="button">
          Inspect route <span aria-hidden="true">↗</span>
        </button>
        <button
          aria-pressed={shortlisted}
          className={shortlisted ? "portal-save-button is-saved" : "portal-save-button"}
          onClick={onToggleShortlist}
          type="button"
        >
          {shortlisted
            ? `Saved ${recommendation.title}`
            : `Shortlist ${recommendation.title}`}
        </button>
      </div>
    </article>
  );
}
