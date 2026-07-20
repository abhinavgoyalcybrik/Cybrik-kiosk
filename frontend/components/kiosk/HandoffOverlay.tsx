"use client";

import { useState } from "react";
import {
  completeKioskHandoff,
  getKioskDeviceId,
  startKioskSession,
  verifyKioskOtp,
} from "@/lib/kiosk/service";
import type { KioskRecommendation, KioskSessionState } from "@/lib/kiosk/types";

type HandoffOverlayProps = {
  programs: KioskRecommendation[];
  onClose: () => void;
};

type HandoffStep = "phone" | "otp" | "complete";

export function HandoffOverlay({ programs, onClose }: HandoffOverlayProps) {
  const [step, setStep] = useState<HandoffStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<KioskSessionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submitPhone = async () => {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit WhatsApp number.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const nextSession = await startKioskSession(phone, getKioskDeviceId());
      setSession(nextSession);
      setStep("otp");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start verification.");
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (!session) return;
    if (otp.length !== 6) {
      setError("Enter the full 6-digit verification code.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const verified = await verifyKioskOtp(session.sessionId, otp);
      await completeKioskHandoff(
        verified.session.sessionId,
        programs.map((program) => program.id),
        programs
      );
      setStep("complete");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not prepare handoff preview.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="passport-handoff-backdrop" role="presentation">
      <section aria-label="Prepare handoff preview" className="passport-handoff-modal" role="dialog">
        <button aria-label="Close handoff preview" className="passport-handoff-close" onClick={onClose} type="button">
          ×
        </button>
        {step === "phone" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitPhone();
            }}
          >
            <p>HANDOFF PREVIEW</p>
            <h2>Save your shortlist</h2>
            <label>
              WhatsApp number
              <input
                aria-label="WhatsApp number"
                inputMode="numeric"
                maxLength={10}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
                value={phone}
              />
            </label>
            <button disabled={busy} type="submit">
              {busy ? "Sending code..." : "Send verification code"}
            </button>
          </form>
        ) : null}
        {step === "otp" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitOtp();
            }}
          >
            <p>VERIFY NUMBER</p>
            <h2>Enter code</h2>
            <label>
              Verification code
              <input
                aria-label="Verification code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                value={otp}
              />
            </label>
            <button disabled={busy} type="submit">
              {busy ? "Preparing..." : "Prepare handoff preview"}
            </button>
          </form>
        ) : null}
        {step === "complete" ? (
          <section aria-live="polite">
            <p>PREVIEW READY</p>
            <h2>Handoff preview prepared</h2>
            <span>This kiosk demo does not send WhatsApp.</span>
            <button onClick={onClose} type="button">Back to matches</button>
          </section>
        ) : null}
        {error ? <p className="passport-handoff-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
