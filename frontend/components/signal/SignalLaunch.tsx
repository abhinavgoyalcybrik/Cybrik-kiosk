import Link from "next/link";
import { PathSignal } from "./PathSignal";
import { SignalShell } from "./SignalShell";

const countrySignals = [
  { code: "CA", name: "Canada", active: true },
  { code: "AU", name: "Australia", active: true },
  { code: "GB", name: "United Kingdom", active: true },
  { code: "DE", name: "Germany", active: false },
];

export function SignalLaunch() {
  return (
    <SignalShell active="launch">
      <section className="signal-launch">
        <div className="signal-launch-copy">
          <p className="signal-eyebrow">
            <span aria-hidden="true" /> PROFILE-LED GLOBAL ADMISSIONS
          </p>
          <h1>
            Your degree path
            <br />
            starts with <em>signal.</em>
          </h1>
          <p className="signal-launch-summary">
            Turn your academics, budget, intake, and career direction into a
            shortlist built for your next move.
          </p>
          <div className="signal-launch-actions">
            <Link className="signal-button signal-button-primary" href="/kiosk">
              Start kiosk match <span aria-hidden="true">→</span>
            </Link>
            <Link className="signal-button signal-button-quiet" href="/portal">
              Open student portal <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="signal-launch-footnote">
            <span className="signal-live-pulse" aria-hidden="true" />
            Built around what admission teams evaluate.
          </div>
        </div>

        <div className="signal-launch-visual" aria-label="Example course match signal">
          <div className="signal-globe-glow" aria-hidden="true" />
          <div className="signal-orbit signal-orbit-outer" aria-hidden="true" />
          <div className="signal-orbit signal-orbit-inner" aria-hidden="true" />
          <div className="signal-launch-core">
            <span className="signal-core-label">PATH SIGNAL</span>
            <strong>87<span>%</span></strong>
            <small>match confidence</small>
          </div>
          <div className="signal-launch-card signal-launch-card-route">
            <span className="signal-card-index">01 / BEST ROUTE</span>
            <strong>Master of Computer Science</strong>
            <p>University of Toronto · Canada</p>
            <PathSignal label="Sample match confidence" percent={92} />
          </div>
          <div className="signal-launch-card signal-launch-card-readiness">
            <span className="signal-card-index">PROFILE READINESS</span>
            <strong>8 / 10</strong>
            <p>Two details unlock sharper matches.</p>
          </div>
          <span className="signal-pin signal-pin-one" aria-hidden="true" />
          <span className="signal-pin signal-pin-two" aria-hidden="true" />
          <span className="signal-pin signal-pin-three" aria-hidden="true" />
        </div>
      </section>

      <section className="signal-country-band" aria-label="Study destination signals">
        <p>DESTINATION SIGNALS</p>
        <div>
          {countrySignals.map((country) => (
            <span className={country.active ? "is-active" : ""} key={country.code}>
              <b>{country.code}</b> {country.name}
            </span>
          ))}
        </div>
        <strong>01—03</strong>
      </section>
    </SignalShell>
  );
}
