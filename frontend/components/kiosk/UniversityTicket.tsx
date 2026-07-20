import type { KioskRecommendation } from "@/lib/kiosk/types";

type UniversityTicketProps = {
  recommendation: KioskRecommendation;
  selected: boolean;
  shortlisted: boolean;
  onSelect: () => void;
  onToggleShortlist: () => void;
};

function getRouteTone(country: string): string {
  if (country === "Australia") return "australia";
  if (country === "United Kingdom") return "united-kingdom";
  if (country === "United States") return "united-states";
  return "canada";
}

export function UniversityTicket({
  recommendation,
  selected,
  shortlisted,
  onSelect,
  onToggleShortlist,
}: UniversityTicketProps) {
  return (
    <article
      className={`university-ticket tone-${getRouteTone(recommendation.country)}${
        selected ? " is-selected" : ""
      }`}
    >
      <div className="university-ticket-route" aria-hidden="true" />
      <div className="university-ticket-body">
        <div className="university-ticket-topline">
          <span>{recommendation.country || "Destination"}</span>
          <strong>{recommendation.score}% match</strong>
        </div>
        <button
          aria-label={`Select ${recommendation.title}`}
          className="university-ticket-title"
          onClick={onSelect}
          type="button"
        >
          <span>{recommendation.university}</span>
          <small>{recommendation.title}</small>
        </button>
        <p>
          {recommendation.location || recommendation.country} · {recommendation.duration} · {recommendation.intakeLabel}
        </p>
        <div className="university-ticket-footer">
          <span>{recommendation.tuitionLabel}</span>
          <button
            aria-pressed={shortlisted}
            className={shortlisted ? "university-ticket-save is-saved" : "university-ticket-save"}
            onClick={onToggleShortlist}
            type="button"
          >
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        </div>
      </div>
    </article>
  );
}
