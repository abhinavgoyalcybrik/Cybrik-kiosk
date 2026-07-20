"use client";

import {
  buildDocumentChecklist,
  getSelectedProgramRequirement,
} from "@/lib/kiosk/service";
import type { KioskProfile, KioskRecommendation } from "@/lib/kiosk/types";

type RequiredDocumentsPanelProps = {
  profile: KioskProfile;
  recommendation: KioskRecommendation | null;
  open: boolean;
  shortlistCount: number;
  onOpenChange: (open: boolean) => void;
  onRequestHandoff: () => void;
};

export function RequiredDocumentsPanel({
  profile,
  recommendation,
  open,
  shortlistCount,
  onOpenChange,
  onRequestHandoff,
}: RequiredDocumentsPanelProps) {
  const requirement = getSelectedProgramRequirement(recommendation);
  const documents = buildDocumentChecklist(profile);

  return (
    <section
      aria-label="Required documents"
      className={open ? "passport-documents is-open" : "passport-documents"}
      data-open={open}
      role="region"
    >
      <div className="passport-panel-heading">
        <div>
          <p>APPLICATION KIT</p>
          <h2>Documents</h2>
        </div>
        <button
          aria-expanded={open}
          aria-label={open ? "Close required documents" : "Open required documents"}
          className="passport-panel-toggle"
          onClick={() => onOpenChange(!open)}
          type="button"
        >
          <span aria-hidden="true">{open ? "−" : "+"}</span>
          <span className="passport-panel-toggle-copy">{open ? "Close" : "Open"}</span>
        </button>
      </div>

      {open ? (
        <div className="passport-document-content">
          <div className="passport-program-requirement">
            <span>{requirement.label}</span>
            <strong>{requirement.value}</strong>
          </div>
          <p className="passport-document-selection">
            {recommendation
              ? `${recommendation.university} · ${recommendation.title}`
              : "Choose a university to inspect catalog context."}
          </p>
          <div className="passport-document-list">
            {documents.map((document) => (
              <article key={document.id}>
                <span aria-hidden="true">{document.status === "ready" ? "✓" : "•"}</span>
                <div>
                  <strong>{document.title}</strong>
                  <small>{document.subtitle}</small>
                </div>
              </article>
            ))}
          </div>
          <p className="passport-document-note">
            Planning checklist only. No files uploaded from kiosk.
          </p>
          <button className="passport-handoff-button" onClick={onRequestHandoff} type="button">
            Prepare handoff preview <span>{shortlistCount || 1} program{shortlistCount === 1 ? "" : "s"}</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
