"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fetchPreferenceOptions, type PreferenceOptions } from "@/lib/api";
import {
  COUNTRY_OPTIONS,
  FIELD_OPTIONS,
  INTAKE_OPTIONS,
  type KioskProfile,
} from "@/lib/kiosk/types";

type KioskPreferencesProps = {
  profile: KioskProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (patch: Partial<KioskProfile>) => void;
  onSubmit: () => void;
  submitting: boolean;
};

function PreferenceSection({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="passport-preference-section">
      <button
        aria-expanded={expanded}
        className="passport-preference-section-toggle"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {title}
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded ? <div className="passport-preference-section-body">{children}</div> : null}
    </section>
  );
}

export function KioskPreferences({
  profile,
  open,
  onOpenChange,
  onChange,
  onSubmit,
  submitting,
}: KioskPreferencesProps) {
  const isNewZealand = profile.preferredCountries[0] === "New Zealand";
  const [options, setOptions] = useState<PreferenceOptions | null>(null);
  const [optionsError, setOptionsError] = useState("");
  useEffect(() => {
    if (!isNewZealand) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) { setOptions(null); setOptionsError(""); }
    });
    fetchPreferenceOptions("New Zealand", controller.signal)
      .then(setOptions)
      .catch((reason) => {
        if (!controller.signal.aborted) setOptionsError(reason instanceof Error ? reason.message : "Could not load options.");
      });
    return () => controller.abort();
  }, [isNewZealand]);
  const score = Number(profile.academicScore);
  const scoreValid = profile.academicScore !== "" && Number.isFinite(score) && score >= 0 && score <= (profile.scoreMode === "cgpa" ? 10 : 100);
  const feeValid = !(profile.tuitionMin || profile.tuitionMax) || (Boolean(profile.feeCurrency) && (!profile.tuitionMin || !profile.tuitionMax || Number(profile.tuitionMin) <= Number(profile.tuitionMax)));
  const ready = Boolean(profile.preferredCountries[0] && profile.studyGoal && profile.preferredFields.length && profile.intakeSeason && scoreValid && feeValid && (!isNewZealand || options));
  return (
    <section
      aria-label="Preferences"
      className={open ? "passport-preferences is-open" : "passport-preferences"}
      data-open={open}
      role="region"
    >
      <div className="passport-panel-heading">
        <div>
          <p>YOUR ROUTE</p>
          <h2>Preferences</h2>
        </div>
        <button
          aria-expanded={open}
          aria-label={open ? "Close preferences" : "Open preferences"}
          className="passport-panel-toggle"
          onClick={() => onOpenChange(!open)}
          type="button"
        >
          <span aria-hidden="true">{open ? "−" : "+"}</span>
          <span className="passport-panel-toggle-copy">{open ? "Close" : "Open"}</span>
        </button>
      </div>

      {open ? (
        <div className="passport-preference-content">
          <PreferenceSection title="Destination">
            <label>
              First choice country
              <select
                aria-label="First choice country"
                onChange={(event) => onChange({ preferredCountries: [event.target.value] })}
                value={profile.preferredCountries[0] ?? COUNTRY_OPTIONS[0]}
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>
          </PreferenceSection>

          {isNewZealand ? (
            <PreferenceSection title="New Zealand options">
              {!options && !optionsError ? <p aria-live="polite">Loading New Zealand cities and institutions…</p> : null}
              {optionsError ? <p role="alert">We couldn’t load New Zealand options. Please retry.</p> : null}
              {options ? <>
                <label>Preferred city<select value={profile.preferredCities[0] ?? ""} onChange={(event) => onChange({ preferredCities: event.target.value ? [event.target.value] : [] })}><option value="">Any city</option>{options.cities.map((city) => <option key={city}>{city}</option>)}</select></label>
                <label>Preferred institution<select value={profile.preferredUniversity} onChange={(event) => onChange({ preferredUniversity: event.target.value })}><option value="">Any institution</option>{options.universities.map((institution) => <option key={institution}>{institution}</option>)}</select></label>
                <label>Fee currency<select value={profile.feeCurrency} onChange={(event) => onChange({ feeCurrency: event.target.value as KioskProfile["feeCurrency"] })}><option value="">Required for a fee range</option>{options.currencies.filter((item) => ["NZD", "AUD", "USD"].includes(item)).map((item) => <option key={item}>{item}</option>)}</select></label>
                <div className="passport-inline-fields"><label>Minimum fee<input min="0" type="number" value={profile.tuitionMin} onChange={(event) => onChange({ tuitionMin: event.target.value })} /></label><label>Maximum fee<input min="0" type="number" value={profile.tuitionMax} onChange={(event) => onChange({ tuitionMax: event.target.value })} /></label></div>
                {!feeValid ? <p role="alert">Select a currency and ensure the minimum fee does not exceed the maximum.</p> : null}
              </> : null}
            </PreferenceSection>
          ) : null}

          <PreferenceSection title="Program">
            <label>Degree level<select value={profile.studyGoal} onChange={(event) => onChange({ studyGoal: event.target.value as KioskProfile["studyGoal"] })}><option value="">Choose a degree level</option><option value="undergraduate">Undergraduate</option><option value="postgraduate">Postgraduate</option></select></label>
            <label>
              Academic track
              <select
                aria-label="Academic track"
                onChange={(event) =>
                  onChange({
                    academicTrack: event.target.value as KioskProfile["academicTrack"],
                    preferredFields: event.target.value ? [event.target.value] : [],
                  })
                }
                value={profile.academicTrack}
              >
                <option value="">Choose your track</option>
                {FIELD_OPTIONS.map((track) => (
                  <option key={track} value={track}>
                    {track}
                  </option>
                ))}
              </select>
            </label>
          </PreferenceSection>

          <PreferenceSection title="Academic score">
            <label>Grading system<select value={profile.scoreMode} onChange={(event) => onChange({ scoreMode: event.target.value as KioskProfile["scoreMode"], academicScore: "" })}><option value="percentage">Percentage</option><option value="cgpa">CGPA out of 10</option></select></label>
            <label>Score<input aria-invalid={profile.academicScore !== "" && !scoreValid} inputMode="decimal" max={profile.scoreMode === "cgpa" ? 10 : 100} min="0" step="0.01" type="number" value={profile.academicScore} onChange={(event) => onChange({ academicScore: event.target.value })} /></label>
            {profile.academicScore !== "" && !scoreValid ? <p role="alert">Enter a value from 0 to {profile.scoreMode === "cgpa" ? 10 : 100}.</p> : null}
          </PreferenceSection>

          <PreferenceSection title="Budget">
            <label>
              Annual budget <strong>₹{profile.budgetMaxLakhs}L</strong>
              <input
                aria-label="Annual budget in lakhs"
                max="70"
                min="10"
                onChange={(event) => onChange({ budgetMaxLakhs: Number(event.target.value) })}
                type="range"
                value={profile.budgetMaxLakhs}
              />
            </label>
          </PreferenceSection>
          <button className="passport-find-button" disabled={!ready || submitting} onClick={onSubmit} type="button">{submitting ? "Finding matching courses…" : ready ? "Find matching courses" : "Complete required preferences"}</button>

          <PreferenceSection title="Intake">
            <label>
              Preferred intake
              <select
                aria-label="Preferred intake"
                onChange={(event) => onChange({ intakeSeason: event.target.value })}
                value={profile.intakeSeason}
              >
                {INTAKE_OPTIONS.map((intake) => (
                  <option key={intake} value={intake}>
                    {intake}
                  </option>
                ))}
              </select>
            </label>
          </PreferenceSection>
        </div>
      ) : null}
    </section>
  );
}
