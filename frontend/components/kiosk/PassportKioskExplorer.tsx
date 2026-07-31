"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SourceBadge } from "@/components/signal/SourceBadge";
import { loadPublicKioskRecommendations } from "@/lib/kiosk/service";
import {
  INITIAL_KIOSK_PROFILE,
  type KioskProfile,
  type KioskRecommendation,
  type KioskRecommendationBundle,
  type KioskSortMode,
} from "@/lib/kiosk/types";
import { HandoffOverlay } from "./HandoffOverlay";
import { KioskPreferences } from "./KioskPreferences";
import { RequiredDocumentsPanel } from "./RequiredDocumentsPanel";
import { UniversityTicket } from "./UniversityTicket";

function sortRecommendations(
  recommendations: KioskRecommendation[],
  sortMode: KioskSortMode,
  selectedCurrency: string
): KioskRecommendation[] {
  return [...recommendations].sort((left, right) => {
    if (sortMode === "lowest_cost") {
      const currencies = new Set(recommendations.map((item) => item.tuitionLabel.split(" ")[0]).filter(Boolean));
      if (!selectedCurrency && currencies.size > 1) return right.score - left.score;
      return (left.tuitionValue ?? Number.POSITIVE_INFINITY) - (right.tuitionValue ?? Number.POSITIVE_INFINITY);
    }
    if (sortMode === "fastest_intake") {
      return left.intakeLabel.localeCompare(right.intakeLabel);
    }
    return right.score - left.score;
  });
}

export function PassportKioskExplorer() {
  const [profile, setProfile] = useState<KioskProfile>(INITIAL_KIOSK_PROFILE);
  const [bundle, setBundle] = useState<KioskRecommendationBundle | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [shortlistIds, setShortlistIds] = useState<number[]>([]);
  const [sortMode, setSortMode] = useState<KioskSortMode>("best_match");
  const [preferencesOpen, setPreferencesOpen] = useState(true);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const loadRecommendations = useCallback(async (nextProfile: KioskProfile) => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setLoading(true);
    setError("");

    try {
      const nextBundle = await loadPublicKioskRecommendations(nextProfile);
      if (requestId.current !== activeRequest) return;
      setBundle(nextBundle);
      setSelectedId((current) =>
        nextBundle.recommendations.some((recommendation) => recommendation.id === current)
          ? current
          : (nextBundle.recommendations[0]?.id ?? null)
      );
    } catch (reason) {
      if (requestId.current !== activeRequest) return;
      setError(reason instanceof Error ? reason.message : "Could not load university matches.");
    } finally {
      if (requestId.current === activeRequest) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const compactView = window.matchMedia("(max-width: 760px)");
    const syncPanelState = () => {
      if (compactView.matches) {
        setPreferencesOpen(false);
        setDocumentsOpen(false);
      }
    };
    syncPanelState();
    compactView.addEventListener("change", syncPanelState);
    return () => compactView.removeEventListener("change", syncPanelState);
  }, []);

  const recommendations = useMemo(
    () => sortRecommendations(bundle?.recommendations ?? [], sortMode, profile.feeCurrency),
    [bundle, profile.feeCurrency, sortMode]
  );
  const selectedRecommendation =
    recommendations.find((recommendation) => recommendation.id === selectedId) ?? recommendations[0] ?? null;
  const selectedPrograms = useMemo(() => {
    const shortlisted = recommendations.filter((recommendation) => shortlistIds.includes(recommendation.id));
    if (shortlisted.length > 0) return shortlisted;
    return selectedRecommendation ? [selectedRecommendation] : recommendations.slice(0, 1);
  }, [recommendations, selectedRecommendation, shortlistIds]);

  const updateProfile = (patch: Partial<KioskProfile>) => {
    setProfile((current) => {
      const countryChanged = patch.preferredCountries && patch.preferredCountries[0] !== current.preferredCountries[0];
      if (countryChanged) {
        requestId.current += 1;
        setBundle(null);
        setSelectedId(null);
        setShortlistIds([]);
        setError("");
      }
      return {
        ...current,
        ...patch,
        ...(countryChanged ? { preferredCities: [], preferredUniversity: "", feeCurrency: "" as const, tuitionMin: "", tuitionMax: "" } : {}),
      };
    });
  };

  const toggleShortlist = (id: number) => {
    setShortlistIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const resetExplorer = () => {
    setProfile(INITIAL_KIOSK_PROFILE);
    setShortlistIds([]);
    setSortMode("best_match");
    requestId.current += 1;
    setBundle(null);
    setSelectedId(null);
    setError("");
  };

  return (
    <main className="passport-kiosk">
      <header className="passport-topbar">
        <Link className="passport-brand" href="/">
          <span aria-hidden="true">✦</span>
          <span><strong>SIGNAL STUDIO</strong><small>STUDENT KIOSK</small></span>
        </Link>
        <div className="passport-topbar-actions">
          {bundle ? <SourceBadge source={bundle.source} /> : <span className="passport-loading-badge">Preferences not submitted</span>}
          <button className="passport-reset-button" onClick={resetExplorer} type="button">Reset</button>
        </div>
      </header>

      <div className="passport-grid">
        <KioskPreferences
          onChange={updateProfile}
          onSubmit={() => void loadRecommendations(profile)}
          submitting={loading}
          onOpenChange={setPreferencesOpen}
          open={preferencesOpen}
          profile={profile}
        />

        <section aria-label="University matches" className="passport-results" role="region">
          <div className="passport-results-heading">
            <div>
              <p>YOUR DESTINATIONS</p>
              <h1>University matches</h1>
              <span>{bundle?.totalPrograms ?? 0} programs mapped to your route</span>
            </div>
            {bundle ? <button className="passport-refresh-button" disabled={loading} onClick={() => void loadRecommendations(profile)} type="button">{loading ? "Updating…" : "Update matches"}</button> : null}
          </div>

          {bundle ? <div className="passport-sort" aria-label="Sort university matches">
            {([
              ["best_match", "Best match"],
              ["lowest_cost", "Lowest cost"],
              ["fastest_intake", "Next intake"],
            ] as const).map(([value, label]) => (
              <button
                aria-pressed={sortMode === value}
                className={sortMode === value ? "is-active" : ""}
                key={value}
                onClick={() => setSortMode(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div> : null}

          {loading ? <p className="passport-results-status" role="status">Finding courses that match your preferences…</p> : null}
          {error ? <p className="passport-results-error" role="alert">We couldn’t load matching courses right now. Please try again.</p> : null}
          {!loading && !error && !bundle ? <p className="passport-results-status">{profile.preferredCountries[0] === "New Zealand" ? "Complete your New Zealand study preferences to view matching universities and courses." : "Select your preferences, then find matching courses."}</p> : null}
          {!loading && !error && bundle && recommendations.length === 0 ? <p className="passport-results-status">No New Zealand courses currently match all your selected preferences. Try adjusting your city, intake, tuition budget, degree level, or field of study.</p> : null}
          {!loading && !error && bundle && recommendations.length > 0 ? (
            <div className="passport-ticket-list">
              {recommendations.map((recommendation) => (
                <UniversityTicket
                  key={recommendation.id}
                  onSelect={() => setSelectedId(recommendation.id)}
                  onToggleShortlist={() => toggleShortlist(recommendation.id)}
                  recommendation={recommendation}
                  selected={recommendation.id === selectedRecommendation?.id}
                  shortlisted={shortlistIds.includes(recommendation.id)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <RequiredDocumentsPanel
          onOpenChange={setDocumentsOpen}
          onRequestHandoff={() => setHandoffOpen(true)}
          open={documentsOpen}
          profile={profile}
          recommendation={selectedRecommendation}
          shortlistCount={selectedPrograms.length}
        />
      </div>

      {handoffOpen ? (
        <HandoffOverlay onClose={() => setHandoffOpen(false)} programs={selectedPrograms} />
      ) : null}
    </main>
  );
}
