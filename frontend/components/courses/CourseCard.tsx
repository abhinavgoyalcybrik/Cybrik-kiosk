import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import MatchScoreMeter from "./MatchScoreMeter";
import { fetchCourseWhatsAppSharePayload } from "@/lib/api";

type CourseCardProps = {
  id: number;
  title: string;
  university: string;
  logoUrl?: string | null;
  location: string;
  tuition: string;
  applicationFee: string;
  duration: string;
  intake: string;
  ielts: string;
  degreeLevel: string;
  score?: number | null;
  isShortlisted?: boolean;
  onToggleShortlist?: (id: number) => void;
};

export default function CourseCard({
  id,
  title,
  university,
  logoUrl = null,
  location,
  tuition,
  applicationFee,
  duration,
  intake,
  ielts,
  degreeLevel,
  score,
  isShortlisted = false,
  onToggleShortlist,
}: CourseCardProps) {
  const [isLogoErrored, setIsLogoErrored] = useState(false);
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const hasScore = typeof score === "number";
  const primaryRibbon = hasScore ? "Instant Submission" : null;
  const secondaryRibbon = hasScore && score >= 80 ? "Instant Offer" : null;
  const intakeItems =
    intake === "N/A"
      ? ["TBA"]
      : intake
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3);
  const chips = [
    hasScore ? "Prime Match" : "Prime",
  ];
  const successLabel = hasScore && score >= 75 ? "High" : hasScore && score >= 60 ? "Medium" : "Growing";
  const universityInitials = university
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  const shouldShowLogo = Boolean(logoUrl) && !isLogoErrored;
  const detailsHref = `/course/${id}`;

  return (
    <article className={`program-card ${isShortlisted ? "program-card-shortlisted" : ""}`}>
      {primaryRibbon || secondaryRibbon || isShortlisted ? (
        <div className="card-ribbons">
          {primaryRibbon ? <span className="card-top-ribbon">{primaryRibbon}</span> : null}
          {secondaryRibbon ? <span className="card-top-ribbon secondary">{secondaryRibbon}</span> : null}
          {isShortlisted ? <span className="card-top-ribbon shortlist">Shortlisted</span> : null}
        </div>
      ) : null}

      <div className="program-card-header">
        <div className="university-mark">
          {shouldShowLogo ? (
            <Image
              src={logoUrl ?? ""}
              alt={`${university} logo`}
              className="university-logo"
              width={56}
              height={56}
              onError={() => setIsLogoErrored(true)}
            />
          ) : (
            <span>{universityInitials || "U"}</span>
          )}
        </div>
        <div>
          <Link href={detailsHref} className="program-card-link university-link">
            <p className="university-name">{university}</p>
          </Link>
          <p className="degree-level">{degreeLevel}</p>
        </div>
      </div>

      <Link href={detailsHref} className="program-card-link">
        <h3 className="program-title">{title}</h3>
      </Link>

      <div className="chip-row">
        {chips.map((chip) => (
          <span key={chip} className="info-chip">
            {chip}
          </span>
        ))}
      </div>

      <div className="card-divider" />

      <div className="meta-grid">
        <Meta label="Location" value={location} />
        <Meta label="Tuition (1st year)" value={tuition} />
        <Meta label="Application fee" value={applicationFee} />
        <Meta label="Duration" value={duration} />
      </div>

      <div className="card-divider" />

      <div className="success-row">
        <span className="success-label">Success chance</span>
        <span className="success-value">
          <span className="success-dot" aria-hidden />
          {successLabel}
        </span>
      </div>

      {hasScore ? (
        <div className="score-block">
          <MatchScoreMeter score={score} />
        </div>
      ) : null}

      <div className="card-divider" />

      <div className="intake-block">
        <span className="intake-label">Available intakes</span>
        <div className="intake-list">
          {intakeItems.map((item) => (
            <span key={item} className="intake-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="card-divider" />

      <div className="card-footer">
        <div className="card-footer-stack">
          <div className="card-footer-topline">
            <span className="text-xs font-bold text-slate-400 uppercase">IELTS: {ielts}</span>
            <Link href={detailsHref} className="card-footer-cta">
              View Details →
            </Link>
          </div>
          <div className="card-action-row">
            <Link
              href={detailsHref}
              className="card-action-btn card-action-btn-primary"
            >
              Apply Now
            </Link>
            {onToggleShortlist ? (
              <button
                type="button"
                onClick={() => onToggleShortlist(id)}
                className={`card-action-btn ${
                  isShortlisted
                    ? "card-action-btn-selected"
                    : "card-action-btn-secondary"
                }`}
              >
                {isShortlisted ? "Shortlisted" : "Shortlist"}
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  if (isWhatsAppLoading) {
                    return;
                  }

                  try {
                    setIsWhatsAppLoading(true);
                    const payload = await fetchCourseWhatsAppSharePayload(id);
                    window.open(payload.whatsapp_url, "_blank", "noopener,noreferrer");
                  } catch {
                    const fallback = encodeURIComponent(
                      `Hi, I am interested in the ${title} program at ${university}. Can I get more details?`
                    );
                    window.open(`https://wa.me/?text=${fallback}`, "_blank", "noopener,noreferrer");
                  } finally {
                    setIsWhatsAppLoading(false);
                  }
                }}
                className="card-action-btn card-action-btn-whatsapp"
              >
                {isWhatsAppLoading ? "Opening..." : "WhatsApp"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="meta-row">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{value}</span>
    </div>
  );
}
