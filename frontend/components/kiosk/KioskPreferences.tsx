"use client";

import { useState, type ReactNode } from "react";
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
}: KioskPreferencesProps) {
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

          <PreferenceSection title="Program">
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
