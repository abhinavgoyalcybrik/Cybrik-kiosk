"use client";

import { useMemo, useState } from "react";
import type { KioskProfile } from "@/lib/kiosk/types";
import { INITIAL_KIOSK_PROFILE } from "@/lib/kiosk/types";
import {
  getPortalSections,
  getProfileReadiness,
  type PortalSectionId,
  PORTAL_DEMO_RECOMMENDATIONS,
} from "@/lib/signal/portal";
import { DocumentTaskList } from "./DocumentTaskList";
import { MatchCard } from "./MatchCard";
import { PathSignal } from "./PathSignal";
import { ShortlistPanel } from "./ShortlistPanel";
import { SignalShell } from "./SignalShell";
import { SourceBadge } from "./SourceBadge";

const initialPortalProfile: KioskProfile = {
  ...INITIAL_KIOSK_PROFILE,
  fullName: "Aarav Malhotra",
  email: "aarav.malhotra@example.com",
  studyGoal: "postgraduate",
  academicTrack: "Computer Science",
  academicScore: "8.2",
  englishScore: "7.5",
  hasWorkExperience: true,
  workExperienceYears: "2",
};

const sectionLabels = getPortalSections();

export function PortalExperience() {
  const [activeSection, setActiveSection] = useState<PortalSectionId>("overview");
  const [profile, setProfile] = useState<KioskProfile>(initialPortalProfile);
  const [shortlistIds, setShortlistIds] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState(PORTAL_DEMO_RECOMMENDATIONS[0].id);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const source = "demo_catalog" as const;
  const readiness = getProfileReadiness(profile);
  const selectedMatch =
    PORTAL_DEMO_RECOMMENDATIONS.find((item) => item.id === selectedId) ??
    PORTAL_DEMO_RECOMMENDATIONS[0];
  const shortlisted = useMemo(
    () =>
      PORTAL_DEMO_RECOMMENDATIONS.filter((item) => shortlistIds.includes(item.id)),
    [shortlistIds]
  );

  const toggleShortlist = (id: number) => {
    setShortlistIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const updateProfile = <Field extends keyof KioskProfile>(
    field: Field,
    value: KioskProfile[Field]
  ) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  return (
    <SignalShell active="portal">
      <div className="signal-portal-shell">
        <aside className="portal-rail" aria-label="Portal sections">
          <div className="portal-identity">
            <span>STUDENT SPACE</span>
            <strong>Aarav M.</strong>
          </div>
          <nav className="portal-section-nav" aria-label="Student portal">
            {sectionLabels.map((section, index) => (
              <button
                aria-pressed={activeSection === section.id}
                className={activeSection === section.id ? "is-active" : ""}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <span aria-hidden="true">0{index + 1}</span>
                {section.label}
              </button>
            ))}
          </nav>
          <div className="portal-rail-status">
            <p>PATH READINESS</p>
            <PathSignal label="Profile readiness" percent={readiness.percent} tone="violet" />
          </div>
        </aside>

        <section className="portal-stage">
          <header className="portal-stage-header">
            <div>
              <p>{sectionLabels.find((section) => section.id === activeSection)?.kicker}</p>
              <h1>{sectionLabels.find((section) => section.id === activeSection)?.label}</h1>
            </div>
            <div className="portal-stage-tools">
              <SourceBadge source={source} />
              <button aria-label="Open notifications" className="portal-icon-button" type="button">
                <span aria-hidden="true">✦</span>
              </button>
            </div>
          </header>

          {activeSection === "overview" ? (
            <Overview
              match={selectedMatch}
              profile={profile}
              readiness={readiness}
              shortlistCount={shortlisted.length}
              onOpenMatches={() => setActiveSection("matches")}
              onOpenProfile={() => setActiveSection("profile")}
              onSelectMatch={() => setActiveSection("matches")}
            />
          ) : null}

          {activeSection === "matches" ? (
            <section className="portal-matches">
              <div className="portal-matches-intro">
                <div>
                  <p className="portal-section-kicker">SIGNAL-RANKED FOR YOU</p>
                  <h2>Three routes worth attention.</h2>
                </div>
                <div className="portal-filter-row" aria-label="Active filters">
                  <span>Postgraduate</span>
                  <span>2027 intake</span>
                  <span>Computer Science</span>
                </div>
              </div>
              <div className="portal-matches-grid">
                <div className="portal-match-list">
                  {PORTAL_DEMO_RECOMMENDATIONS.map((recommendation) => (
                    <MatchCard
                      key={recommendation.id}
                      onSelect={() => setSelectedId(recommendation.id)}
                      onToggleShortlist={() => toggleShortlist(recommendation.id)}
                      recommendation={recommendation}
                      selected={selectedId === recommendation.id}
                      shortlisted={shortlistIds.includes(recommendation.id)}
                    />
                  ))}
                </div>
                <MatchDetail
                  match={selectedMatch}
                  shortlisted={shortlistIds.includes(selectedMatch.id)}
                  onToggleShortlist={() => toggleShortlist(selectedMatch.id)}
                />
              </div>
            </section>
          ) : null}

          {activeSection === "shortlist" ? (
            <ShortlistPanel
              onOpenMatches={() => setActiveSection("matches")}
              recommendations={shortlisted}
              source={source}
            />
          ) : null}

          {activeSection === "documents" ? (
            <section className="portal-documents-panel">
              <div className="portal-documents-intro">
                <p className="portal-section-kicker">APPLICATION KIT</p>
                <h2>Build evidence before applications open.</h2>
                <p>Preview planned materials. Upload and delivery stay disabled in this rating build.</p>
              </div>
              <DocumentTaskList
                activeTaskId={activeDocumentId}
                onPreview={setActiveDocumentId}
              />
              {activeDocumentId ? (
                <div className="portal-document-preview" role="status">
                  Preview selected. No document data leaves this browser in demo mode.
                </div>
              ) : null}
            </section>
          ) : null}

          {activeSection === "profile" ? (
            <ProfileEditor
              profile={profile}
              readiness={readiness}
              onChange={updateProfile}
              onViewMatches={() => setActiveSection("matches")}
            />
          ) : null}
        </section>
      </div>
    </SignalShell>
  );
}

function Overview({
  match,
  profile,
  readiness,
  shortlistCount,
  onOpenMatches,
  onOpenProfile,
  onSelectMatch,
}: {
  match: (typeof PORTAL_DEMO_RECOMMENDATIONS)[number];
  profile: KioskProfile;
  readiness: ReturnType<typeof getProfileReadiness>;
  shortlistCount: number;
  onOpenMatches: () => void;
  onOpenProfile: () => void;
  onSelectMatch: () => void;
}) {
  return (
    <section className="portal-overview">
      <div className="portal-overview-hero">
        <div>
          <p className="portal-section-kicker">GOOD AFTERNOON, {profile.fullName.split(" ")[0].toUpperCase()}</p>
          <h2>One smart update can sharpen your whole shortlist.</h2>
          <p>Admission signal is strongest for Canada and Australia. Finish profile details before comparing final routes.</p>
          <div className="portal-overview-actions">
            <button className="portal-primary-button" onClick={onOpenMatches} type="button">
              Inspect matches <span aria-hidden="true">→</span>
            </button>
            <button className="portal-text-button" onClick={onOpenProfile} type="button">
              Edit profile <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
        <div className="portal-overview-path">
          <span>YOUR PATH</span>
          <strong>{readiness.percent}<small>%</small></strong>
          <PathSignal label="Profile readiness" percent={readiness.percent} />
          <p>{readiness.missing.length === 0 ? "Profile signal complete" : `${readiness.missing.length} fields can raise match confidence`}</p>
        </div>
      </div>

      <div className="portal-overview-grid">
        <article className="portal-next-action">
          <span>01 / NEXT MOVE</span>
          <h3>Compare your top two Canada routes.</h3>
          <p>They are closest on profile fit, cost confidence, and intake timing.</p>
          <button onClick={onOpenMatches} type="button">Open comparison <span aria-hidden="true">→</span></button>
        </article>
        <article className="portal-best-match">
          <div className="portal-best-match-heading">
            <span>BEST CURRENT ROUTE</span>
            <button onClick={onSelectMatch} type="button">View details</button>
          </div>
          <h3>{match.title}</h3>
          <p>{match.university} · {match.country}</p>
          <div className="portal-best-match-score"><strong>{match.score}%</strong><span>match confidence</span></div>
        </article>
        <article className="portal-shortlist-stat">
          <span>SAVED ROUTES</span>
          <strong>{shortlistCount.toString().padStart(2, "0")}</strong>
          <p>Programs held for advisor review.</p>
        </article>
      </div>
    </section>
  );
}

function MatchDetail({
  match,
  shortlisted,
  onToggleShortlist,
}: {
  match: (typeof PORTAL_DEMO_RECOMMENDATIONS)[number];
  shortlisted: boolean;
  onToggleShortlist: () => void;
}) {
  return (
    <aside className="portal-match-detail">
      <span className="portal-section-kicker">ROUTE INSPECTOR</span>
      <h2>{match.title}</h2>
      <p className="portal-match-detail-university">{match.university}<br />{match.location}</p>
      <div className="portal-detail-confidence">
        <strong>{match.score}%</strong>
        <div><span>confidence</span><PathSignal label="Match confidence" percent={match.score} /></div>
      </div>
      <div className="portal-detail-reasons">
        <p>WHY THIS ROUTE</p>
        {match.reasons.map((reason) => <span key={reason}>↗ {reason}</span>)}
      </div>
      <dl className="portal-detail-facts">
        <div><dt>Tuition</dt><dd>{match.tuitionLabel}</dd></div>
        <div><dt>Duration</dt><dd>{match.duration}</dd></div>
        <div><dt>Intake</dt><dd>{match.intakeLabel}</dd></div>
        <div><dt>English</dt><dd>{match.ielts}</dd></div>
      </dl>
      <button className={shortlisted ? "portal-detail-save is-saved" : "portal-detail-save"} onClick={onToggleShortlist} type="button">
        {shortlisted ? "Saved to shortlist" : "Save this route"} <span aria-hidden="true">+</span>
      </button>
    </aside>
  );
}

function ProfileEditor({
  profile,
  readiness,
  onChange,
  onViewMatches,
}: {
  profile: KioskProfile;
  readiness: ReturnType<typeof getProfileReadiness>;
  onChange: <Field extends keyof KioskProfile>(field: Field, value: KioskProfile[Field]) => void;
  onViewMatches: () => void;
}) {
  return (
    <section className="portal-profile-panel">
      <div className="portal-profile-lead">
        <p className="portal-section-kicker">MATCH SIGNAL</p>
        <h2>Give your profile more precision.</h2>
        <p>These details change match confidence. They do not send anything to an advisor in demo mode.</p>
        <PathSignal label="Profile readiness" percent={readiness.percent} tone="violet" />
      </div>
      <form className="portal-profile-form" onSubmit={(event) => { event.preventDefault(); onViewMatches(); }}>
        <label>
          Full name
          <input onChange={(event) => onChange("fullName", event.target.value)} value={profile.fullName} />
        </label>
        <label>
          Study goal
          <select onChange={(event) => onChange("studyGoal", event.target.value as KioskProfile["studyGoal"])} value={profile.studyGoal}>
            <option value="undergraduate">Undergraduate</option>
            <option value="postgraduate">Postgraduate</option>
          </select>
        </label>
        <label>
          Academic track
          <select onChange={(event) => onChange("academicTrack", event.target.value as KioskProfile["academicTrack"])} value={profile.academicTrack}>
            <option value="Computer Science">Computer Science</option>
            <option value="Data Science">Data Science</option>
            <option value="Engineering">Engineering</option>
            <option value="Business">Business</option>
          </select>
        </label>
        <label>
          Academic score
          <input inputMode="decimal" onChange={(event) => onChange("academicScore", event.target.value)} value={profile.academicScore} />
        </label>
        <label>
          IELTS / English score
          <input inputMode="decimal" onChange={(event) => onChange("englishScore", event.target.value)} value={profile.englishScore} />
        </label>
        <button className="portal-primary-button" type="submit">Refresh matches <span aria-hidden="true">→</span></button>
      </form>
    </section>
  );
}
