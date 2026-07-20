"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useEffectEvent, useMemo, useState } from "react";

import {
  buildCostBreakdown,
  buildDocumentChecklist,
  buildSopPreview,
  completeKioskHandoff,
  getKioskDeviceId,
  loadKioskRecommendations,
  primeKioskCatalog,
  resendKioskOtp,
  saveKioskProfile,
  startKioskSession,
  verifyKioskOtp,
} from "@/lib/kiosk/service";
import {
  COUNTRY_OPTIONS,
  ENGLISH_EXAM_OPTIONS,
  FIELD_OPTIONS,
  INITIAL_KIOSK_PROFILE,
  INTAKE_OPTIONS,
  INTAKE_YEAR_OPTIONS,
  STUDY_GOAL_OPTIONS,
  WORK_EXPERIENCE_OPTIONS,
  type KioskDocument,
  type KioskHandoffReceipt,
  type KioskProfile,
  type KioskRecommendation,
  type KioskRecommendationBundle,
  type KioskScreen,
  type KioskSessionState,
  type KioskSortMode,
} from "@/lib/kiosk/types";

const COUNTRY_CODE = "+91";
const AUTO_RESET_MS = 28_000;
const SESSION_IDLE_MS = 150_000;
const LOGO_SRC = "/cybrik-logo.png";

type FlashMessage = {
  tone: "success" | "warning" | "neutral";
  text: string;
} | null;

function countFilledProfileFields(profile: KioskProfile): number {
  let filled = 0;
  if (profile.fullName.trim()) filled += 1;
  if (profile.email.trim()) filled += 1;
  if (profile.studyGoal) filled += 1;
  if (profile.academicTrack) filled += 1;
  if (profile.preferredCountries.length > 0) filled += 1;
  if (profile.preferredFields.length > 0) filled += 1;
  if (profile.intakeSeason) filled += 1;
  if (profile.intakeYear) filled += 1;
  if (profile.academicScore.trim()) filled += 1;
  if (profile.englishExam) filled += 1;
  if (
    profile.englishExam &&
    profile.englishExam !== "None yet" &&
    profile.englishScore.trim()
  ) {
    filled += 1;
  }
  if (profile.budgetMaxLakhs > 0) filled += 1;
  if (!profile.hasWorkExperience || profile.workExperienceYears.trim()) filled += 1;
  return filled;
}

function isProfileReady(profile: KioskProfile): boolean {
  const englishReady =
    !profile.englishExam ||
    profile.englishExam === "None yet" ||
    Boolean(profile.englishScore.trim());

  return Boolean(
    profile.fullName.trim() &&
      profile.studyGoal &&
      profile.academicTrack &&
      profile.preferredCountries.length > 0 &&
      profile.preferredFields.length > 0 &&
      profile.intakeSeason &&
      profile.intakeYear &&
      profile.academicScore.trim() &&
      englishReady
  );
}

function formatSeconds(seconds: number): string {
  if (seconds <= 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatPhoneInput(phone: string): string {
  if (!phone) {
    return "";
  }
  if (phone.length <= 5) {
    return `${COUNTRY_CODE} ${phone}`;
  }
  return `${COUNTRY_CODE} ${phone.slice(0, 5)} ${phone.slice(5, 10)}`;
}

function parseFirstIntakeLabel(label: string): number {
  const normalized = label.toLowerCase();
  if (normalized.includes("jan") || normalized.includes("feb") || normalized.includes("mar")) {
    return 1;
  }
  if (normalized.includes("apr") || normalized.includes("may") || normalized.includes("jun")) {
    return 2;
  }
  if (normalized.includes("jul") || normalized.includes("aug") || normalized.includes("sep")) {
    return 3;
  }
  if (normalized.includes("oct") || normalized.includes("nov") || normalized.includes("dec")) {
    return 4;
  }
  return 99;
}

function toggleArrayItem(values: string[], value: string, limit = 4): string[] {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }
  if (values.length >= limit) {
    return values;
  }
  return [...values, value];
}

function getProfileSummary(profile: KioskProfile): string {
  const level = profile.studyGoal === "postgraduate" ? "Postgrad" : "Undergrad";
  const track = profile.academicTrack || "Open field";
  const exam =
    profile.englishExam && profile.englishExam !== "None yet" && profile.englishScore
      ? `${profile.englishExam} ${profile.englishScore}`
      : profile.englishExam === "None yet"
        ? "English score pending"
        : "English profile open";
  const scoreMode = profile.scoreMode === "cgpa" ? "/ 10" : "%";
  const score = profile.academicScore ? `${profile.academicScore} ${scoreMode}` : "score pending";
  return `${level} · ${track}\n${score} · ${exam}`;
}

function getProvisionalMatches(profileCompletion: number, profile: KioskProfile): number {
  const base =
    10 +
    Math.round(profileCompletion / 4) +
    profile.preferredCountries.length * 3 +
    profile.preferredFields.length * 4;
  return Math.max(12, Math.min(48, base));
}

function getNumericScore(profile: KioskProfile): number {
  if (profile.academicScore.trim()) {
    const parsed = Number(profile.academicScore);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return profile.scoreMode === "cgpa" ? 8.2 : 82;
}

function getNumericEnglishScore(profile: KioskProfile): number {
  if (profile.englishScore.trim()) {
    const parsed = Number(profile.englishScore);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 7.5;
}

function getDisplayScore(profile: KioskProfile): string {
  const value = getNumericScore(profile);
  return profile.scoreMode === "cgpa"
    ? `${value.toFixed(1)} / 10`
    : `${Math.round(value)}%`;
}

function getBudgetDisplay(profile: KioskProfile): string {
  if (profile.budgetMaxLakhs <= 25) {
    return `${profile.budgetMaxLakhs} or below`;
  }
  const min = Math.max(15, profile.budgetMaxLakhs - 10);
  return `${min} - ${profile.budgetMaxLakhs}`;
}

function getExamChipLabel(profile: KioskProfile): string {
  if (!profile.englishExam) {
    return "No exam chosen";
  }
  if (profile.englishExam === "None yet") {
    return "Exam pending";
  }
  return `${profile.englishExam} ${profile.englishScore || getNumericEnglishScore(profile).toFixed(1)}`;
}

export default function KioskExperience() {
  const [screen, setScreen] = useState<KioskScreen>("attract");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [profile, setProfile] = useState<KioskProfile>(INITIAL_KIOSK_PROFILE);
  const [session, setSession] = useState<KioskSessionState | null>(null);
  const [bundle, setBundle] = useState<KioskRecommendationBundle | null>(null);
  const [shortlistIds, setShortlistIds] = useState<number[]>([]);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<KioskSortMode>("best_match");
  const [countryFilter, setCountryFilter] = useState("All");
  const [busyAction, setBusyAction] = useState<
    null | "send_otp" | "verify_otp" | "resend_otp" | "matching" | "handoff"
  >(null);
  const [matchProgress, setMatchProgress] = useState(12);
  const [handoffReceipt, setHandoffReceipt] = useState<KioskHandoffReceipt | null>(null);
  const [resetAt, setResetAt] = useState<number | null>(null);
  const [flashMessage, setFlashMessage] = useState<FlashMessage>(null);
  const [clockMs, setClockMs] = useState(() => Date.now());

  const profileCompletion = useMemo(() => {
    return Math.round((countFilledProfileFields(profile) / 12) * 100);
  }, [profile]);

  const provisionalMatches = useMemo(() => {
    return getProvisionalMatches(profileCompletion, profile);
  }, [profile, profileCompletion]);

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of bundle?.recommendations ?? []) {
      counts.set(item.country, (counts.get(item.country) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [bundle]);

  const filteredRecommendations = useMemo(() => {
    const items = [...(bundle?.recommendations ?? [])];
    const filtered =
      countryFilter === "All"
        ? items
        : items.filter((item) => item.country === countryFilter);

    filtered.sort((left, right) => {
      if (sortMode === "lowest_cost") {
        const leftCost = left.tuitionValue ?? Number.POSITIVE_INFINITY;
        const rightCost = right.tuitionValue ?? Number.POSITIVE_INFINITY;
        return leftCost - rightCost;
      }

      if (sortMode === "fastest_intake") {
        return parseFirstIntakeLabel(left.intakeLabel) - parseFirstIntakeLabel(right.intakeLabel);
      }

      return right.score - left.score;
    });

    return filtered;
  }, [bundle, countryFilter, sortMode]);

  const activeRecommendationId =
    selectedRecommendationId !== null &&
    filteredRecommendations.some((item) => item.id === selectedRecommendationId)
      ? selectedRecommendationId
      : filteredRecommendations[0]?.id ?? null;

  const selectedRecommendation =
    filteredRecommendations.find((item) => item.id === activeRecommendationId) ?? null;

  const resendSecondsRemaining = session
    ? Math.max(0, Math.ceil((session.resendAvailableAt - clockMs) / 1000))
    : 0;

  const sessionSecondsRemaining = session
    ? Math.max(0, Math.ceil((session.expiresAt - clockMs) / 1000))
    : 0;

  const autoResetSeconds = resetAt
    ? Math.max(0, Math.ceil((resetAt - clockMs) / 1000))
    : 0;

  const applyResetState = (message?: FlashMessage) => {
    setScreen("attract");
    setPhoneInput("");
    setOtpInput("");
    setProfile(INITIAL_KIOSK_PROFILE);
    setSession(null);
    setBundle(null);
    setShortlistIds([]);
    setSelectedRecommendationId(null);
    setSortMode("best_match");
    setCountryFilter("All");
    setBusyAction(null);
    setMatchProgress(12);
    setHandoffReceipt(null);
    setResetAt(null);
    setFlashMessage(message ?? null);
  };

  const resetExperience = useEffectEvent((message?: FlashMessage) => {
    applyResetState(message);
  });

  useEffect(() => {
    primeKioskCatalog();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") !== "results") return;
    fetch("/api/courses/")
      .then((r) => r.json())
      .then((data) => {
        const courses = (data.courses ?? []) as Array<{
          course_id: number;
          title: string;
          university: string | { name: string; country?: string; city?: string };
          degree_level: string;
          field_of_study: string;
          tuition_fee: number | null;
          tuition_currency: string;
          duration_months: number | null;
          intake_labels: string[];
          ielts_overall: number | null;
          course_url: string;
        }>;
        const recs: KioskRecommendation[] = courses.map((c) => ({
          id: c.course_id,
          title: c.title,
          university: typeof c.university === "object" ? c.university.name : c.university,
          logoUrl: null,
          location: typeof c.university === "object" ? (c.university.city ?? "") : "",
          country: typeof c.university === "object" ? (c.university.country ?? "") : "",
          degreeLevel: c.degree_level,
          fieldOfStudy: c.field_of_study,
          tuitionLabel: c.tuition_fee ? `${c.tuition_currency ?? "AUD"} ${c.tuition_fee.toLocaleString()}` : "TBC",
          tuitionValue: c.tuition_fee,
          duration: c.duration_months ? `${c.duration_months} months` : "TBC",
          intakeLabel: (c.intake_labels ?? []).join(", ") || "TBC",
          intakeList: c.intake_labels ?? [],
          ielts: c.ielts_overall ? `${c.ielts_overall}` : "TBC",
          score: 80,
          successLabel: "High",
          reasons: [],
        }));
        setBundle({ source: "live_catalog", totalPrograms: recs.length, profileSignalChips: [], recommendations: recs });
        setScreen("results");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session && !resetAt) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [resetAt, session]);

  useEffect(() => {
    if (!flashMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setFlashMessage(null);
    }, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [flashMessage]);

  useEffect(() => {
    if (screen === "attract") {
      return;
    }

    let timeoutId = window.setTimeout(() => {
      resetExperience({
        tone: "neutral",
        text: "Session timed out. Kiosk is ready for the next student.",
      });
    }, SESSION_IDLE_MS);

    const bumpActivity = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        resetExperience({
          tone: "neutral",
          text: "Session timed out. Kiosk is ready for the next student.",
        });
      }, SESSION_IDLE_MS);
    };

    window.addEventListener("pointerdown", bumpActivity, true);
    window.addEventListener("keydown", bumpActivity, true);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pointerdown", bumpActivity, true);
      window.removeEventListener("keydown", bumpActivity, true);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "matching") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMatchProgress((current) => {
        if (current >= 94) {
          return current;
        }
        return Math.min(94, current + Math.max(3, Math.round((94 - current) * 0.18)));
      });
    }, 220);

    return () => window.clearInterval(intervalId);
  }, [screen]);

  useEffect(() => {
    if (screen !== "handoff" || resetAt === null) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      resetExperience({
        tone: "neutral",
        text: "Kiosk reset complete. Ready for the next walk-in.",
      });
    }, Math.max(0, resetAt - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [resetAt, screen]);

  useEffect(() => {
    if (screen !== "phone" && screen !== "otp") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        if (screen === "phone") {
          setPhoneInput((current) =>
            current.length < 10 ? `${current}${event.key}` : current
          );
        } else {
          setOtpInput((current) =>
            current.length < 6 ? `${current}${event.key}` : current
          );
        }
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        if (screen === "phone") {
          setPhoneInput((current) => current.slice(0, -1));
        } else {
          setOtpInput((current) => current.slice(0, -1));
        }
      }

      if (event.key === "Escape" && screen === "otp") {
        event.preventDefault();
        setScreen("phone");
        setOtpInput("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screen]);

  const setProfileField = <Field extends keyof KioskProfile>(
    field: Field,
    value: KioskProfile[Field]
  ) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePhoneNumpad = (key: string) => {
    if (busyAction) {
      return;
    }
    if (key === "clear") {
      setPhoneInput("");
      return;
    }
    if (key === "backspace") {
      setPhoneInput((current) => current.slice(0, -1));
      return;
    }
    setPhoneInput((current) => (current.length < 10 ? `${current}${key}` : current));
  };

  const handleOtpNumpad = (key: string) => {
    if (busyAction) {
      return;
    }
    if (key === "clear") {
      setOtpInput("");
      return;
    }
    if (key === "backspace") {
      setOtpInput((current) => current.slice(0, -1));
      return;
    }
    setOtpInput((current) => (current.length < 6 ? `${current}${key}` : current));
  };

  const handleSendOtp = async () => {
    if (phoneInput.length !== 10) {
      setFlashMessage({
        tone: "warning",
        text: "Enter a valid 10-digit WhatsApp number to continue.",
      });
      return;
    }

    try {
      setBusyAction("send_otp");
      const nextSession = await startKioskSession(phoneInput, getKioskDeviceId());
      setSession(nextSession);
      setProfile((current) => ({
        ...current,
        phone: nextSession.phone,
      }));
      setOtpInput("");
      setScreen("otp");
      setFlashMessage({
        tone: "success",
        text: "OTP sent. Continue with the 6-digit verification code.",
      });
    } catch (error) {
      setFlashMessage({
        tone: "warning",
        text:
          error instanceof Error
            ? error.message
            : "Could not start the kiosk session.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleVerifyOtp = async () => {
    if (!session) {
      setFlashMessage({
        tone: "warning",
        text: "This session is no longer active. Start again.",
      });
      setScreen("phone");
      return;
    }

    if (otpInput.length !== 6) {
      setFlashMessage({
        tone: "warning",
        text: "Enter the full 6-digit code.",
      });
      return;
    }

    try {
      setBusyAction("verify_otp");
      const result = await verifyKioskOtp(session.sessionId, otpInput);
      setSession(result.session);
      setProfile((current) => ({
        ...current,
        phone: result.session.phone,
        ...result.profilePrefill,
      }));
      setScreen("profile");
      setFlashMessage({
        tone: "success",
        text: "Number verified. Build the student profile to generate matches.",
      });
    } catch (error) {
      setFlashMessage({
        tone: "warning",
        text:
          error instanceof Error
            ? error.message
            : "Could not verify the code.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleResendOtp = async () => {
    if (!session) {
      return;
    }

    try {
      setBusyAction("resend_otp");
      const nextSession = await resendKioskOtp(session.sessionId);
      setSession(nextSession);
      setOtpInput("");
      setFlashMessage({
        tone: "success",
        text: "A fresh OTP has been issued for this session.",
      });
    } catch (error) {
      setFlashMessage({
        tone: "warning",
        text:
          error instanceof Error
            ? error.message
            : "Could not resend the code right now.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateMatches = async () => {
    if (!session) {
      setFlashMessage({
        tone: "warning",
        text: "Verify the phone number first.",
      });
      setScreen("phone");
      return;
    }

    if (!isProfileReady(profile)) {
      setFlashMessage({
        tone: "warning",
        text: "Complete the core profile fields before matching.",
      });
      return;
    }

    try {
      setBusyAction("matching");
      setMatchProgress(14);
      setScreen("matching");
      await saveKioskProfile(session.sessionId, profile);
      const nextBundle = await loadKioskRecommendations(session.sessionId, profile);
      setMatchProgress(100);

      window.setTimeout(() => {
        startTransition(() => {
          setBundle(nextBundle);
          setSelectedRecommendationId(nextBundle.recommendations[0]?.id ?? null);
          setShortlistIds([]);
          setSortMode("best_match");
          setCountryFilter("All");
        });
        setScreen("results");
        setFlashMessage({
          tone: "success",
          text: `${nextBundle.totalPrograms} programs ranked for ${profile.fullName || "this student"}.`,
        });
      }, 220);
    } catch (error) {
      setScreen("profile");
      setFlashMessage({
        tone: "warning",
        text:
          error instanceof Error
            ? error.message
            : "Could not generate matches right now.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleShortlist = (recommendationId: number) => {
    setShortlistIds((current) =>
      current.includes(recommendationId)
        ? current.filter((item) => item !== recommendationId)
        : [...current, recommendationId]
    );
  };

  const handleSendKit = async () => {
    if (!session || !bundle) {
      return;
    }

    try {
      setBusyAction("handoff");
      const receipt = await completeKioskHandoff(
        session.sessionId,
        shortlistIds,
        bundle.recommendations
      );
      setHandoffReceipt(receipt);
      setScreen("handoff");
      setResetAt(Date.now() + AUTO_RESET_MS);
      setFlashMessage({
        tone: "success",
        text: "WhatsApp handoff queued. The kiosk will reset automatically.",
      });
    } catch (error) {
      setFlashMessage({
        tone: "warning",
        text:
          error instanceof Error
            ? error.message
            : "Could not finish the handoff.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="kiosk-shell-page">
      {flashMessage ? (
        <div className={`k-toast k-toast-${flashMessage.tone}`}>{flashMessage.text}</div>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          className="kiosk-device"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.22, 0.8, 0.3, 1] }}
        >
          {screen === "attract" ? (
            <IdleScreen onStart={() => setScreen("phone")} />
          ) : null}

          {screen === "phone" ? (
            <PhoneScreen
              phoneInput={phoneInput}
              busy={busyAction === "send_otp"}
              onDigit={handlePhoneNumpad}
              onSend={handleSendOtp}
            />
          ) : null}

          {screen === "otp" && session ? (
            <OtpScreen
              session={session}
              otpInput={otpInput}
              resendSecondsRemaining={resendSecondsRemaining}
              sessionSecondsRemaining={sessionSecondsRemaining}
              busy={busyAction === "verify_otp" || busyAction === "resend_otp"}
              onDigit={handleOtpNumpad}
              onBack={() => {
                setScreen("phone");
                setOtpInput("");
              }}
              onResend={handleResendOtp}
              onVerify={handleVerifyOtp}
            />
          ) : null}

          {screen === "profile" ? (
            <ProfileScreen
              profile={profile}
              session={session}
              profileCompletion={profileCompletion}
              provisionalMatches={provisionalMatches}
              onChange={setProfileField}
              onToggleCountry={(value) =>
                setProfile((current) => ({
                  ...current,
                  preferredCountries: toggleArrayItem(
                    current.preferredCountries,
                    value,
                    4
                  ),
                }))
              }
              onToggleField={(value) =>
                setProfile((current) => ({
                  ...current,
                  preferredFields: toggleArrayItem(
                    current.preferredFields,
                    value,
                    3
                  ),
                }))
              }
              onContinue={handleGenerateMatches}
            />
          ) : null}

          {screen === "matching" ? (
            <MatchingScreen
              profile={profile}
              progress={matchProgress}
            />
          ) : null}

          {screen === "results" && bundle ? (
            <ResultsScreen
              profile={profile}
              profileCompletion={profileCompletion}
              totalPrograms={bundle.totalPrograms}
              filteredRecommendations={filteredRecommendations}
              selectedRecommendation={selectedRecommendation}
              shortlistIds={shortlistIds}
              countryFilter={countryFilter}
              countryCounts={countryCounts}
              sortMode={sortMode}
              handoffBusy={busyAction === "handoff"}
              onChangeCountryFilter={setCountryFilter}
              onChangeSortMode={setSortMode}
              onPickRecommendation={setSelectedRecommendationId}
              onToggleShortlist={handleToggleShortlist}
              onSendKit={handleSendKit}
              onOpenDetail={(id) => {
                setSelectedRecommendationId(id);
                setScreen("detail");
              }}
              onOpenDocuments={() => setScreen("documents")}
            />
          ) : null}

          {screen === "detail" && selectedRecommendation ? (
            <ProgramDetailScreen
              profile={profile}
              recommendation={selectedRecommendation}
              shortlisted={shortlistIds.includes(selectedRecommendation.id)}
              onBack={() => setScreen("results")}
              onToggleShortlist={() => handleToggleShortlist(selectedRecommendation.id)}
              onOpenDocuments={() => setScreen("documents")}
            />
          ) : null}

          {screen === "documents" && bundle ? (
            <DocumentsScreen
              profile={profile}
              shortlistIds={shortlistIds}
              recommendations={bundle.recommendations}
              handoffBusy={busyAction === "handoff"}
              onBack={() => setScreen("results")}
              onSendKit={handleSendKit}
            />
          ) : null}

          {screen === "handoff" && handoffReceipt ? (
            <HandoffResultScreen
              receipt={handoffReceipt}
              autoResetSeconds={autoResetSeconds}
              onDone={() =>
                applyResetState({
                  tone: "neutral",
                  text: "Kiosk reset complete. Ready for the next walk-in.",
                })
              }
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KioskFrame({
  label,
  children,
  bg,
}: {
  label: string;
  children: React.ReactNode;
  bg?: string;
}) {
  return (
    <div
      className="kiosk"
      style={{
        background:
          bg ||
          "linear-gradient(135deg, rgba(255, 255, 255, 0.48), rgba(255, 255, 255, 0.22)), linear-gradient(135deg, #f9fbff 0%, #eef5ff 50%, #fff7f0 100%)",
      }}
    >
      {children}
      <div className="k-screenlabel">{label}</div>
      <div className="k-home" />
    </div>
  );
}

function TopBar({
  tag = "AI Admission Assistant",
  right,
  small,
}: {
  tag?: string;
  right?: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="k-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Image
          className={small ? "k-logo k-logo-sm" : "k-logo"}
          src={LOGO_SRC}
          alt="Cybrik"
          width={small ? 134 : 166}
          height={small ? 48 : 60}
          priority
        />
        {tag ? (
          <div
            className="k-brandtag"
            style={{
              borderLeft: "2px solid rgba(17, 24, 51, 0.14)",
              paddingLeft: 20,
            }}
          >
            {tag}
          </div>
        ) : null}
      </div>
      {right}
    </div>
  );
}

function StepsBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="steps">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`s ${index < step - 1 ? "on" : ""} ${index === step - 1 ? "cur" : ""}`}
        />
      ))}
    </div>
  );
}

function Ring({
  pct = 65,
  size = 200,
  stroke = 16,
  color = "var(--navy)",
  track = "var(--line)",
  children,
}: {
  pct?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

function Numpad({
  onKey,
  size = 150,
}: {
  onKey: (value: string) => void;
  size?: number;
}) {
  return (
    <div className="numpad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
        <button
          key={value}
          type="button"
          className="numkey"
          style={{ height: size }}
          onClick={() => onKey(String(value))}
        >
          {value}
        </button>
      ))}
      <button
        type="button"
        className="numkey numkey-ghost"
        style={{ height: size, fontSize: 36 }}
        onClick={() => onKey("clear")}
      >
        clear
      </button>
      <button
        type="button"
        className="numkey"
        style={{ height: size }}
        onClick={() => onKey("0")}
      >
        0
      </button>
      <button
        type="button"
        className="numkey numkey-ghost"
        style={{ height: size }}
        onClick={() => onKey("backspace")}
      >
        ⌫
      </button>
    </div>
  );
}

function IdleScreen({ onStart }: { onStart: () => void }) {
  return (
    <KioskFrame
      label="01 · IDLE / ATTRACT"
      bg="linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(236, 242, 255, 0.9) 52%, rgba(255, 242, 230, 0.92) 100%)"
    >
      <div className="hero-screen">
        <div className="hero-frame-bar">
          <div className="k-pill-ghost hero-frame-pill">
            <span className="dot dot-green" />
            8,400+ students placed
          </div>
        </div>

        <div className="hero-layout">
          <div className="hero-copy">
            <div className="hero-brand-lockup">
              <Image
                className="hero-brand-logo"
                src={LOGO_SRC}
                alt="Cybrik Solutions"
                width={520}
                height={174}
                priority
              />
              <div className="hero-brand-copy">
                <span className="hero-brand-kicker">AI Admission Assistant</span>
                <span className="hero-brand-note">
                  Built for kiosks, walk-ins, and instant WhatsApp handoff
                </span>
              </div>
            </div>

            <div className="eyebrow hero-copy-kicker">
              Free · No login · Takes 90 seconds
            </div>

            <h1 className="hero-copy-title">
              Dream universities.
              <br />
              Matched before they
              <br />
              walk away.
            </h1>

            <p className="hero-copy-body">
              Students tap once, build a quick profile, and leave with ranked programs, next
              steps, and documents delivered directly to WhatsApp.
            </p>

            <div className="hero-country-strip">
              {[
                ["🇨🇦", "Canada"],
                ["🇦🇺", "Australia"],
                ["🇬🇧", "United Kingdom"],
                ["🇺🇸", "United States"],
              ].map(([flag, label]) => (
                <span key={label} className="hero-country-chip">
                  <span>{flag}</span>
                  {label}
                </span>
              ))}
            </div>

            <div className="hero-action-row">
              <button
                type="button"
                className="btn btn-green btn-xl hero-start-btn"
                onClick={onStart}
              >
                Tap to start →
              </button>
              <div className="hero-touch-copy">
                or touch
                <br />
                anywhere
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-panel">
              <div className="hero-visual-grid" />
              <div className="hero-visual-glow hero-visual-glow-a" />
              <div className="hero-visual-glow hero-visual-glow-b" />

              <OrbitTrack className="hero-orbit-track hero-orbit-track-a">
                🇨🇦 Canada
              </OrbitTrack>
              <OrbitTrack className="hero-orbit-track hero-orbit-track-b is-reverse">
                🇦🇺 Australia
              </OrbitTrack>
              <OrbitTrack className="hero-orbit-track hero-orbit-track-c">
                🇬🇧 UK
              </OrbitTrack>
              <OrbitTrack className="hero-orbit-track hero-orbit-track-d is-reverse">
                🇺🇸 USA
              </OrbitTrack>

              <div className="hero-globe-core">
                <div className="hero-globe-sphere">
                  <div className="hero-globe-grid hero-globe-grid-h" />
                  <div className="hero-globe-grid hero-globe-grid-v" />
                  <div className="hero-globe-grid hero-globe-grid-diag" />
                  <span className="hero-pin hero-pin-a" />
                  <span className="hero-pin hero-pin-b" />
                  <span className="hero-pin hero-pin-c" />
                  <span className="hero-pin hero-pin-d" />
                </div>
                <div className="hero-beacon hero-beacon-a" />
                <div className="hero-beacon hero-beacon-b" />
              </div>

              <HeroMatchCard
                style={{ position: "absolute", top: "16%", left: "2%" }}
                title="U. of Toronto"
                status="92% match"
              />
              <HeroMatchCard
                style={{ position: "absolute", bottom: "10%", right: "-1%" }}
                title="UBC Vancouver"
                status="89% match"
              />
              <div className="hero-mini-stat">
                <span className="hero-mini-stat-label">Live shortlist engine</span>
                <strong>4,770 programs scanned</strong>
                <p>Rotating flags signal target countries and attract foot traffic.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </KioskFrame>
  );
}

function OrbitTrack({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <span className="hero-orbit-flag">
        <span className="hero-orbit-flag-label">{children}</span>
      </span>
    </div>
  );
}

function HeroMatchCard({
  title,
  status,
  style,
}: {
  title: string;
  status: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="card hero-match-card"
      style={{
        ...style,
        padding: 18,
        display: "flex",
        gap: 14,
        alignItems: "center",
        boxShadow: "var(--shadow-lg)",
        borderRadius: 24,
      }}
    >
      <div className="uni-logo hero-match-logo">▲</div>
      <div>
        <div className="title" style={{ fontSize: 20 }}>
          {title}
        </div>
        <div className="status status-green" style={{ fontSize: 18 }}>
          <span className="dot dot-green" />
          {status}
        </div>
      </div>
    </div>
  );
}

function PhoneScreen({
  phoneInput,
  busy,
  onDigit,
  onSend,
}: {
  phoneInput: string;
  busy: boolean;
  onDigit: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <KioskFrame label="02 · PHONE NUMBER">
      <TopBar small right={<StepsBar step={1} total={3} />} />

      <div className="stage" style={{ gap: 90 }}>
        <div style={{ flex: "1 1 48%" }}>
          <div className="eyebrow">Step 1 of 3</div>
          <div className="h1" style={{ marginTop: 16 }}>
            What&apos;s your
            <br />
            WhatsApp number?
          </div>
          <div className="body" style={{ fontSize: 31, marginTop: 22 }}>
            We&apos;ll text your matches and documents straight to your phone.
          </div>

          <div
            className={`field ${phoneInput ? "field-filled" : ""}`}
            style={{ marginTop: 46, padding: "34px 36px", whiteSpace: "nowrap" }}
          >
            <span style={{ fontSize: 52, fontWeight: 800, color: "var(--navy)" }}>{COUNTRY_CODE}</span>
            <div style={{ width: 2, height: 58, background: "var(--line)" }} />
            <span
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "var(--navy)",
                letterSpacing: 3,
              }}
            >
              {phoneInput ? formatPhoneInput(phoneInput).replace(`${COUNTRY_CODE} `, "") : "98765 43210"}
            </span>
            <span style={{ fontSize: 52, color: "var(--blue)", fontWeight: 400 }}>|</span>
          </div>
          <div className="small" style={{ marginTop: 18, color: "var(--ink-3)" }}>
            10 digits · OTP sent on WhatsApp
          </div>

          <button
            type="button"
            className="btn btn-blue btn-xl"
            style={{ marginTop: 48, padding: "32px 80px", opacity: phoneInput.length === 10 && !busy ? 1 : 0.6 }}
            disabled={phoneInput.length !== 10 || busy}
            onClick={onSend}
          >
            {busy ? "Sending OTP..." : "Send OTP →"}
          </button>
          <div className="small" style={{ marginTop: 20, color: "var(--ink-3)", maxWidth: 560 }}>
            By continuing you agree to receive messages from Cybrik. Standard rates may apply.
          </div>
        </div>

        <div style={{ flex: "1 1 52%", maxWidth: 720 }}>
          <Numpad size={150} onKey={onDigit} />
        </div>
      </div>
    </KioskFrame>
  );
}

function OtpScreen({
  session,
  otpInput,
  resendSecondsRemaining,
  sessionSecondsRemaining,
  busy,
  onDigit,
  onBack,
  onResend,
  onVerify,
}: {
  session: KioskSessionState;
  otpInput: string;
  resendSecondsRemaining: number;
  sessionSecondsRemaining: number;
  busy: boolean;
  onDigit: (value: string) => void;
  onBack: () => void;
  onResend: () => void;
  onVerify: () => void;
}) {
  const digits = Array.from({ length: 6 }, (_, index) => otpInput[index] ?? "");

  return (
    <KioskFrame label="03 · OTP VERIFY">
      <TopBar small right={<StepsBar step={2} total={3} />} />

      <div
        className="stage"
        style={{ gap: 90, alignItems: "flex-start", paddingTop: 30 }}
      >
        <div style={{ flex: "1 1 50%" }}>
          <div className="eyebrow">Step 2 of 3</div>
          <div className="h1" style={{ marginTop: 16 }}>
            Check WhatsApp
          </div>
          <div className="body" style={{ fontSize: 31, marginTop: 20 }}>
            We sent a 6-digit code to{" "}
            <b style={{ color: "var(--navy)" }}>{session.maskedPhone}</b>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
            {digits.map((digit, index) => (
              <div
                key={index}
                className={`otpbox ${
                  index === otpInput.length && otpInput.length < 6 ? "otpbox-active" : ""
                }`}
              >
                {digit || (index === otpInput.length && otpInput.length < 6 ? (
                  <span style={{ color: "var(--blue)", fontWeight: 400 }}>|</span>
                ) : (
                  ""
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            <button
              type="button"
              className="small link-reset"
              style={{ color: "var(--ink-3)" }}
              disabled={resendSecondsRemaining > 0 || busy}
              onClick={onResend}
            >
              ↻ Resend code in {formatSeconds(resendSecondsRemaining)}
            </button>
            <button
              type="button"
              className="blue-text link-reset"
              style={{ fontWeight: 700, fontSize: 24 }}
              onClick={onBack}
            >
              Change number
            </button>
          </div>

          <div
            className="card"
            style={{
              marginTop: 40,
              padding: 26,
              background: "linear-gradient(135deg, rgba(22, 204, 138, 0.12), rgba(91, 124, 250, 0.08))",
              borderColor: "rgba(22, 204, 138, 0.2)",
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "var(--green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 30,
                  flexShrink: 0,
                }}
              >
                C
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="title" style={{ fontSize: 24 }}>
                    Cybrik
                  </span>
                  <span className="small" style={{ fontSize: 19, color: "var(--ink-3)" }}>
                    {sessionSecondsRemaining > 0 ? "now" : "expired"}
                  </span>
                </div>
                <div className="body" style={{ fontSize: 25, marginTop: 6, color: "var(--navy)" }}>
                  Your Cybrik verification code is{" "}
                  <b>{session.demoCode ?? "472985"}</b>. Valid for 5 minutes.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 50%", maxWidth: 720 }}>
          <Numpad size={132} onKey={onDigit} />
          <button
            type="button"
            className="btn btn-blue btn-xl btn-full"
            style={{ marginTop: 28, opacity: otpInput.length === 6 && !busy ? 1 : 0.6 }}
            disabled={otpInput.length !== 6 || busy}
            onClick={onVerify}
          >
            {busy ? "Verifying..." : "Verify & continue →"}
          </button>
        </div>
      </div>
    </KioskFrame>
  );
}

function ProfileScreen({
  profile,
  session,
  profileCompletion,
  provisionalMatches,
  onChange,
  onToggleCountry,
  onToggleField,
  onContinue,
}: {
  profile: KioskProfile;
  session: KioskSessionState | null;
  profileCompletion: number;
  provisionalMatches: number;
  onChange: <Field extends keyof KioskProfile>(
    field: Field,
    value: KioskProfile[Field]
  ) => void;
  onToggleCountry: (value: string) => void;
  onToggleField: (value: string) => void;
  onContinue: () => void;
}) {
  const scoreValue = getNumericScore(profile);
  const englishValue = getNumericEnglishScore(profile);
  const scoreMin = profile.scoreMode === "cgpa" ? 5 : 50;
  const scoreMax = profile.scoreMode === "cgpa" ? 10 : 100;
  const scoreStep = profile.scoreMode === "cgpa" ? 0.1 : 1;
  const scorePct = ((scoreValue - scoreMin) / (scoreMax - scoreMin)) * 100;
  const budgetPct = ((profile.budgetMaxLakhs - 15) / (80 - 15)) * 100;
  const englishPct = ((englishValue - 4) / (9 - 4)) * 100;

  return (
    <KioskFrame label="04 · BUILD PROFILE (~45s)">
      <TopBar small right={<StepsBar step={3} total={3} />} />

      <div
        className="stage"
        style={{
          gap: 48,
          alignItems: "stretch",
          paddingTop: 8,
          paddingBottom: 48,
        }}
      >
        <div style={{ flex: "0 0 30%", display: "flex", flexDirection: "column" }}>
          <div className="eyebrow">Step 3 of 3</div>
          <div className="h1" style={{ marginTop: 14, fontSize: 58 }}>
            Build your
            <br />
            profile
          </div>
          <div className="status status-green" style={{ marginTop: 18 }}>
            <span className="dot dot-green" />
            Live updates enabled
          </div>

          <div className="card-tint" style={{ padding: 28, marginTop: 30 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <span className="title" style={{ fontSize: 26 }}>
                Profile completion
              </span>
              <span className="h3" style={{ fontSize: 32, color: "var(--green-d)" }}>
                {profileCompletion}%
              </span>
            </div>
            <div className="bar" style={{ height: 18 }}>
              <span style={{ width: `${profileCompletion}%` }} />
            </div>
            <div className="small" style={{ marginTop: 16 }}>
              Recommendation confidence:{" "}
              <b style={{ color: "var(--green-d)" }}>
                {profileCompletion >= 80 ? "High" : profileCompletion >= 50 ? "Medium" : "Low"}
              </b>
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginTop: 24, textAlign: "center" }}>
            <div className="eyebrow">Matched so far</div>
            <div
              className="display"
              style={{ fontSize: 110, color: "var(--blue)", marginTop: 4 }}
            >
              {provisionalMatches}
            </div>
            <div className="small" style={{ fontSize: 22 }}>
              programs · updating live
            </div>
          </div>

          <div className="card-flat" style={{ padding: 24, marginTop: 24 }}>
            <div className="small" style={{ fontSize: 21, lineHeight: 1.45 }}>
              Verified number:{" "}
              <b style={{ color: "var(--navy)" }}>
                {session ? `${COUNTRY_CODE} ${session.phone}` : "Not set"}
              </b>
              <br />
              {getProfileSummary(profile).split("\n").map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-blue btn-xl btn-full"
            style={{ marginTop: "auto" }}
            onClick={onContinue}
          >
            See my {provisionalMatches} matches →
          </button>
        </div>

        <div
          style={{
            flex: "1 1 70%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "32px 48px",
            alignContent: "start",
          }}
        >
          <ChoiceField
            label="Degree"
            options={STUDY_GOAL_OPTIONS.map((item) => ({
              label: item.label,
              active:
                (profile.studyGoal === "undergraduate" && item.value === "undergraduate") ||
                (profile.studyGoal === "postgraduate" && item.value === "postgraduate"),
            }))}
            onToggle={(value) => {
              const chosen = STUDY_GOAL_OPTIONS.find((item) => item.label === value);
              onChange("studyGoal", chosen?.value ?? "");
            }}
          />

          <SliderField
            label="CGPA / Percentage"
            valueLabel={getDisplayScore(profile)}
            min={scoreMin}
            max={scoreMax}
            step={scoreStep}
            value={scoreValue}
            pct={scorePct}
            onChange={(value) =>
              onChange(
                "academicScore",
                profile.scoreMode === "cgpa" ? value.toFixed(1) : String(Math.round(value))
              )
            }
            secondaryChips={[
              {
                label: profile.scoreMode === "cgpa" ? "CGPA" : "Percentage",
                active: true,
                onClick: () =>
                  onChange(
                    "scoreMode",
                    profile.scoreMode === "cgpa" ? "percentage" : "cgpa"
                  ),
              },
            ]}
          />

          <ChoiceField
            label="Field of study"
            hint="tap up to 3"
            options={FIELD_OPTIONS.map((item) => ({
              label: item,
              active: profile.preferredFields.includes(item),
            }))}
            green
            onToggle={onToggleField}
          />

          <SliderField
            label="Yearly budget (₹ lakh)"
            valueLabel={getBudgetDisplay(profile)}
            min={15}
            max={80}
            step={1}
            value={profile.budgetMaxLakhs}
            pct={budgetPct}
            onChange={(value) => onChange("budgetMaxLakhs", Math.round(value))}
            rangeStart={Math.max(0, budgetPct - 16)}
          />

          <ChoiceField
            label="English profile"
            hint="exam + score"
            options={ENGLISH_EXAM_OPTIONS.map((item) => ({
              label:
                item === profile.englishExam && item !== "None yet" && profile.englishScore
                  ? `${item} ${profile.englishScore}`
                  : item,
              active: profile.englishExam === item,
            }))}
            onToggle={(value) => {
              const selected = ENGLISH_EXAM_OPTIONS.find((item) => value.startsWith(item));
              onChange("englishExam", (selected ?? "") as KioskProfile["englishExam"]);
            }}
          />

          <SliderField
            label="English score"
            valueLabel={getExamChipLabel(profile)}
            min={4}
            max={9}
            step={0.1}
            value={englishValue}
            pct={englishPct}
            disabled={profile.englishExam === "None yet" || !profile.englishExam}
            onChange={(value) => onChange("englishScore", value.toFixed(1))}
            helperText={
              profile.englishExam === "None yet"
                ? "Score capture is optional for now"
                : "Adjust the overall score"
            }
          />

          <div style={{ gridColumn: "1 / -1" }}>
            <ChoiceField
              label="Countries of interest"
              green
              options={COUNTRY_OPTIONS.map((item) => ({
                label: item,
                active: profile.preferredCountries.includes(item),
              }))}
              onToggle={onToggleCountry}
            />
          </div>

          <div className="card" style={{ gridColumn: "1 / -1", padding: 26 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr 1fr",
                gap: 24,
                alignItems: "start",
              }}
            >
              <div>
                <div className="title" style={{ fontSize: 28, marginBottom: 16 }}>
                  Contact details
                </div>
                <div className="k-formstack">
                  <input
                    className="k-input"
                    value={profile.fullName}
                    onChange={(event) => onChange("fullName", event.target.value)}
                    placeholder="Student full name"
                  />
                  <input
                    className="k-input"
                    value={profile.email}
                    onChange={(event) => onChange("email", event.target.value)}
                    placeholder="Email address"
                    type="email"
                  />
                </div>
              </div>

              <div>
                <div className="title" style={{ fontSize: 28, marginBottom: 16 }}>
                  Intake
                </div>
                <div className="k-formstack">
                  <select
                    className="k-input"
                    value={profile.intakeSeason}
                    onChange={(event) => onChange("intakeSeason", event.target.value)}
                  >
                    {INTAKE_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    className="k-input"
                    value={profile.intakeYear}
                    onChange={(event) => onChange("intakeYear", event.target.value)}
                  >
                    {INTAKE_YEAR_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="title" style={{ fontSize: 28, marginBottom: 16 }}>
                  Work experience
                </div>
                <div className="k-formstack">
                  <button
                    type="button"
                    className={`chip ${profile.hasWorkExperience ? "chip-active" : ""}`}
                    onClick={() => onChange("hasWorkExperience", !profile.hasWorkExperience)}
                  >
                    {profile.hasWorkExperience ? "Has experience" : "No experience yet"}
                  </button>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {WORK_EXPERIENCE_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`chip ${
                          profile.workExperienceYears === item ? "chip-green" : ""
                        }`}
                        onClick={() => {
                          onChange("hasWorkExperience", true);
                          onChange("workExperienceYears", item);
                        }}
                      >
                        {item} yrs
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </KioskFrame>
  );
}

function ChoiceField({
  label,
  hint,
  options,
  onToggle,
  green,
}: {
  label: string;
  hint?: string;
  options: Array<{ label: string; active: boolean }>;
  onToggle: (value: string) => void;
  green?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span className="title" style={{ fontSize: 28 }}>
          {label}
        </span>
        {hint ? (
          <span className="small" style={{ color: "var(--ink-3)" }}>
            {hint}
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`chip ${
              option.active ? (green ? "chip-green" : "chip-active") : ""
            }`}
            style={{ fontSize: 24, padding: "16px 24px" }}
            onClick={() => onToggle(option.label)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderField({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  pct,
  onChange,
  rangeStart,
  helperText,
  disabled,
  secondaryChips,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  pct: number;
  onChange: (value: number) => void;
  rangeStart?: number;
  helperText?: string;
  disabled?: boolean;
  secondaryChips?: Array<{ label: string; active: boolean; onClick: () => void }>;
}) {
  const fillStart = rangeStart ?? 0;
  const fillEnd = Math.max(0, Math.min(100, pct));
  const fillWidth = Math.max(0, fillEnd - fillStart);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 18,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span className="title" style={{ fontSize: 28 }}>
          {label}
        </span>
        <span className="h3" style={{ fontSize: 30, whiteSpace: "nowrap" }}>
          {valueLabel}
        </span>
      </div>
      {secondaryChips && secondaryChips.length > 0 ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
          {secondaryChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={`chip ${chip.active ? "chip-blue" : ""}`}
              style={{ fontSize: 18, padding: "10px 16px" }}
              onClick={chip.onClick}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <div style={{ position: "relative", height: 42 }}>
        <div className="bar bar-blue" style={{ height: 16 }}>
          <span
            style={{
              left: `${fillStart}%`,
              width: `${fillWidth}%`,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            left: `calc(${fillEnd}% - 18px)`,
            top: -7,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#fff",
            border: "4px solid var(--blue)",
            boxShadow: "var(--shadow)",
          }}
        />
        {rangeStart != null ? (
          <div
            style={{
              position: "absolute",
              left: `calc(${rangeStart}% - 18px)`,
              top: -7,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#fff",
              border: "4px solid var(--blue)",
              boxShadow: "var(--shadow)",
            }}
          />
        ) : null}
        <input
          type="range"
          className="k-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
      {helperText ? (
        <div className="small" style={{ marginTop: 10, fontSize: 18 }}>
          {helperText}
        </div>
      ) : null}
    </div>
  );
}

function MatchingScreen({
  profile,
  progress,
}: {
  profile: KioskProfile;
  progress: number;
}) {
  return (
    <KioskFrame label="05 · MATCHING (~5s)">
      <TopBar />

      <div className="stage" style={{ justifyContent: "center", gap: 110 }}>
        <Ring pct={progress} size={460} stroke={26} color="var(--green)">
          <div className="display" style={{ fontSize: 210, color: "var(--navy)" }}>
            {Math.max(12, Math.round(progress / 4))}
          </div>
          <div className="title" style={{ fontSize: 32, marginTop: 4 }}>
            programs found
          </div>
        </Ring>

        <div style={{ width: 720 }}>
          <div className="eyebrow" style={{ fontSize: 26, marginBottom: 24 }}>
            Cybrik AI is searching
          </div>
          {[
            ["Scanning 4,770 programs", "done"],
            [`Checking ${profile.academicTrack || "student"} eligibility`, "done"],
            ["Estimating success chance", "doing"],
            ["Drafting your documents", "queued"],
          ].map(([text, state], index) => (
            <div
              key={text}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "22px 0",
                borderBottom: index < 3 ? "1.5px solid var(--line)" : "none",
              }}
            >
              <span className="body" style={{ fontSize: 30, color: "var(--navy)" }}>
                {state === "done" ? "✓ " : state === "doing" ? "◌ " : "○ "}
                {text}
              </span>
              <span
                className="small"
                style={{
                  fontWeight: 700,
                  fontSize: 24,
                  color:
                    state === "done"
                      ? "var(--green-d)"
                      : state === "doing"
                        ? "var(--blue)"
                        : "var(--ink-3)",
                }}
              >
                {state === "done" ? "done" : state === "doing" ? "…" : "queued"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </KioskFrame>
  );
}

function ResultsScreen({
  profile,
  profileCompletion,
  totalPrograms,
  filteredRecommendations,
  selectedRecommendation,
  shortlistIds,
  countryFilter,
  countryCounts,
  sortMode,
  handoffBusy,
  onChangeCountryFilter,
  onChangeSortMode,
  onPickRecommendation,
  onToggleShortlist,
  onSendKit,
  onOpenDetail,
  onOpenDocuments,
}: {
  profile: KioskProfile;
  profileCompletion: number;
  totalPrograms: number;
  filteredRecommendations: KioskRecommendation[];
  selectedRecommendation: KioskRecommendation | null;
  shortlistIds: number[];
  countryFilter: string;
  countryCounts: Array<[string, number]>;
  sortMode: KioskSortMode;
  handoffBusy: boolean;
  onChangeCountryFilter: (value: string) => void;
  onChangeSortMode: (value: KioskSortMode) => void;
  onPickRecommendation: (value: number) => void;
  onToggleShortlist: (value: number) => void;
  onSendKit: () => void;
  onOpenDetail: (id: number) => void;
  onOpenDocuments: () => void;
}) {
  const shortlistCount = shortlistIds.length;
  const handoffPreviewCount =
    shortlistCount > 0 ? shortlistCount : Math.min(3, filteredRecommendations.length);
  const activeRecommendation = selectedRecommendation ?? filteredRecommendations[0] ?? null;
  const sortLabelMap: Record<KioskSortMode, string> = {
    best_match: "Best match",
    lowest_cost: "Lowest cost",
    fastest_intake: "Deadline",
  };

  return (
    <KioskFrame label="RESULTS · A · Program feed">
      <TopBar
        tag="AI Admission Assistant"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="k-pill-ghost">
              <span className="dot dot-green" />
              Live updates
            </div>
            <div className="status status-green" style={{ fontSize: 24 }}>
              Profile {profileCompletion}%
            </div>
          </div>
        }
      />

      <div
        className="results-wrap"
        style={{
          flex: 1,
          display: "flex",
          gap: 40,
          padding: "4px 64px 44px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: "0 0 380px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div
            className="card"
            style={{ padding: 26, display: "flex", alignItems: "center", gap: 22 }}
          >
            <Ring pct={activeRecommendation?.score ?? profileCompletion} size={120} stroke={12} color="var(--green)">
              <div className="h3" style={{ fontSize: 34 }}>
                {activeRecommendation?.score ?? profileCompletion}%
              </div>
            </Ring>
            <div>
              <div className="title" style={{ fontSize: 24 }}>
                Strong profile
              </div>
              <div className="small" style={{ fontSize: 21, whiteSpace: "pre-line" }}>
                {getProfileSummary(profile)}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 26, flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              Filter
            </div>
            {[["All", totalPrograms], ...countryCounts].map(([country, count], index) => {
              const label = String(country);
              const active = countryFilter === label;
              return (
                <button
                  key={label}
                  type="button"
                  className="filter-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 0",
                    borderBottom:
                      index < countryCounts.length
                        ? "1.5px solid var(--line-2)"
                        : "none",
                  }}
                  onClick={() => onChangeCountryFilter(label)}
                >
                  <span
                    className="body"
                    style={{
                      fontSize: 25,
                      color: active ? "var(--navy)" : "var(--ink-2)",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {label === "All" ? "🌍 All countries" : label}
                  </span>
                  <span
                    className="chip"
                    style={{
                      fontSize: 20,
                      padding: "6px 14px",
                      background: active ? "var(--navy)" : "var(--bg-2)",
                      color: active ? "#fff" : "var(--navy)",
                      borderColor: "transparent",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <span className="chip" style={{ fontSize: 20 }}>
                Under ₹{profile.budgetMaxLakhs}L
              </span>
              <span className="chip" style={{ fontSize: 20 }}>
                {getExamChipLabel(profile)}
              </span>
            </div>
          </div>

          <div
            className="card"
            style={{ padding: 26, background: "var(--navy)", borderColor: "var(--navy)" }}
          >
            <div className="eyebrow" style={{ color: "rgba(255,255,255,0.6)" }}>
              ♡ Shortlist
            </div>
            <div className="h2" style={{ color: "#fff", fontSize: 40, marginTop: 4 }}>
              {handoffPreviewCount} programs
            </div>
            <button
              type="button"
              className="small link-reset"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 21, marginTop: 2, textDecoration: "underline" }}
              onClick={onOpenDocuments}
            >
              6 documents ready · review →
            </button>
            <button
              type="button"
              className="btn btn-green btn-full"
              style={{ marginTop: 18, fontSize: 25 }}
              disabled={handoffBusy}
              onClick={onSendKit}
            >
              {handoffBusy ? "Preparing handoff..." : "Send kit to WhatsApp →"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div className="h1" style={{ fontSize: 52 }}>
              ✨ {filteredRecommendations.length} programs found
            </div>
            <div className="seg">
              {(
                [
                  ["best_match", "Best match"],
                  ["lowest_cost", "Lowest cost"],
                  ["fastest_intake", "Deadline"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={sortMode === value ? "on" : ""}
                  onClick={() => onChangeSortMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="results-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 26,
              alignItems: "start",
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {filteredRecommendations.slice(0, 9).map((item) => (
              <ProgramCard
                key={item.id}
                recommendation={item}
                selected={item.id === activeRecommendation?.id}
                shortlisted={shortlistIds.includes(item.id)}
                sortLabel={sortLabelMap[sortMode]}
                onSelect={() => onPickRecommendation(item.id)}
                onToggleShortlist={() => onToggleShortlist(item.id)}
                onOpenDetail={() => onOpenDetail(item.id)}
              />
            ))}
          </div>
          <div
            className="small"
            style={{ textAlign: "center", color: "var(--ink-3)", marginTop: 20 }}
          >
            {filteredRecommendations.length > 9
              ? `↓ Swipe for ${filteredRecommendations.length - 9} more programs`
              : "Showing the top matched programs"}
          </div>
        </div>
      </div>
    </KioskFrame>
  );
}

function ProgramCard({
  recommendation,
  selected,
  shortlisted,
  sortLabel,
  onSelect,
  onToggleShortlist,
  onOpenDetail,
}: {
  recommendation: KioskRecommendation;
  selected: boolean;
  shortlisted: boolean;
  sortLabel: string;
  onSelect: () => void;
  onToggleShortlist: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        padding: 28,
        borderColor: selected ? "var(--blue)" : "var(--line)",
        borderWidth: selected ? 2 : 1.5,
        boxShadow: selected ? "var(--shadow-lg)" : "var(--shadow)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div className="uni-logo">▲</div>
        <div>
          <div className="title" style={{ fontSize: 24 }}>
            {recommendation.university}
          </div>
          <div className="small" style={{ fontSize: 20, color: "var(--ink-3)" }}>
            {recommendation.degreeLevel}
          </div>
        </div>
      </div>

      <div className="h3" style={{ fontSize: 28, marginTop: 16, lineHeight: 1.12 }}>
        {recommendation.title}
      </div>

      <div className="tag tag-prime" style={{ marginTop: 14 }}>
        Prime
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="drow" style={{ padding: "10px 0" }}>
          <span className="k">Location</span>
          <span className="v">{recommendation.location}</span>
        </div>
        <div className="drow" style={{ padding: "10px 0" }}>
          <span className="k">Tuition (1st year)</span>
          <span className="v">{recommendation.tuitionLabel}</span>
        </div>
        <div className="drow" style={{ padding: "10px 0" }}>
          <span className="k">Duration</span>
          <span className="v">{recommendation.duration}</span>
        </div>
      </div>

      <hr className="hr" style={{ margin: "10px 0 16px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="small" style={{ fontWeight: 600 }}>
          Success chance
        </span>
        <span className="status status-green">
          <span className="dot dot-green" />
          {recommendation.successLabel}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
          Available intakes
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {recommendation.intakeList.slice(0, 2).map((intake) => (
            <span key={intake} className="chip" style={{ fontSize: 20, padding: "8px 16px" }}>
              {intake}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "18px 0 16px",
          gap: 12,
        }}
      >
        <span className="eyebrow" style={{ fontSize: 16 }}>
          IELTS: {recommendation.ielts}
        </span>
        <button
          type="button"
          className="blue-text link-reset"
          style={{ fontWeight: 700, fontSize: 22 }}
          onClick={() => {
            onSelect();
            onOpenDetail();
          }}
        >
          {selected ? `${sortLabel} ✓` : "View details →"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <button
          type="button"
          className="btn btn-blue"
          style={{ flex: 1 }}
          onClick={() => {
            onSelect();
            onOpenDetail();
          }}
        >
          Apply Now
        </button>
        <button
          type="button"
          className={`btn ${shortlisted ? "btn-green" : "btn-outline"}`}
          style={{ flex: 1 }}
          onClick={onToggleShortlist}
        >
          {shortlisted ? "Shortlisted" : "♡ Shortlist"}
        </button>
      </div>
    </div>
  );
}

function ProgramDetailScreen({
  profile,
  recommendation,
  shortlisted,
  onBack,
  onToggleShortlist,
  onOpenDocuments,
}: {
  profile: KioskProfile;
  recommendation: KioskRecommendation;
  shortlisted: boolean;
  onBack: () => void;
  onToggleShortlist: () => void;
  onOpenDocuments: () => void;
}) {
  const cost = buildCostBreakdown(recommendation, profile.budgetMaxLakhs);
  const statCards: Array<[string, string]> = [
    ["Tuition / yr", recommendation.tuitionLabel],
    ["Intake", recommendation.intakeLabel],
    ["Duration", recommendation.duration],
    ["Success chance", recommendation.successLabel],
  ];

  const fitReasons =
    recommendation.reasons.length > 0
      ? recommendation.reasons
      : ["Strong overall alignment with your stated profile"];

  return (
    <KioskFrame label="SUB · PROGRAM DETAIL">
      <TopBar
        small
        right={
          <button type="button" className="blue-text link-reset" style={{ fontWeight: 700, fontSize: 24 }} onClick={onBack}>
            ← Back to results
          </button>
        }
      />

      <div style={{ flex: 1, display: "flex", gap: 48, padding: "4px 64px 44px", minHeight: 0, overflowY: "auto" }}>
        <div style={{ flex: "1 1 58%", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div className="uni-logo uni-logo-lg">▲</div>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontSize: 22 }}>{recommendation.location}</div>
              <div className="h1" style={{ fontSize: 52, marginTop: 6 }}>{recommendation.university}</div>
              <div className="title" style={{ fontSize: 30, color: "var(--ink-2)", fontWeight: 600, marginTop: 6 }}>
                {recommendation.title}
              </div>
              <div style={{ marginTop: 14 }}>
                <span className="tag tag-prime">Prime</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 30 }}>
            {statCards.map(([label, value]) => (
              <div key={label} className="card" style={{ padding: "22px 22px" }}>
                <div className="eyebrow" style={{ fontSize: 16 }}>{label}</div>
                <div className="h3" style={{ fontSize: 28, marginTop: 8 }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="h3" style={{ fontSize: 32, marginTop: 32 }}>Why you&apos;re a strong fit</div>
          <div className="card" style={{ padding: 30, marginTop: 16 }}>
            {fitReasons.map((reason, index) => (
              <div
                key={reason}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "15px 0",
                  borderBottom: index < fitReasons.length - 1 ? "1.5px solid var(--line)" : "none",
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "var(--green-tint)",
                    color: "var(--green-d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                <span className="body" style={{ fontSize: 26, color: "var(--navy)" }}>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: "1 1 42%", display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card" style={{ padding: 32, display: "flex", alignItems: "center", gap: 28 }}>
            <Ring pct={recommendation.score} size={180} stroke={16} color="var(--green)">
              <div className="h1" style={{ fontSize: 56 }}>{recommendation.score}%</div>
              <div className="small" style={{ fontSize: 18 }}>match</div>
            </Ring>
            <div>
              <div className="title" style={{ fontSize: 28 }}>
                {recommendation.score >= 85 ? "Excellent match" : recommendation.score >= 65 ? "Strong match" : "Growing match"}
              </div>
              <div className="body" style={{ fontSize: 24, marginTop: 6 }}>
                Based on your academics, English score, and budget profile.
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 30, flex: 1 }}>
            <div className="h3" style={{ fontSize: 30 }}>Cost vs. your budget</div>
            <div style={{ position: "relative", paddingTop: 40, marginTop: 24 }}>
              <div className="bar bar-blue" style={{ height: 30 }}>
                <span style={{ width: `${cost.estimatePct}%` }} />
              </div>
              <div
                style={{
                  position: "absolute",
                  left: `${cost.capPct}%`,
                  top: 18,
                  bottom: -30,
                  borderLeft: "3px dashed var(--orange)",
                }}
              >
                <span
                  className="small"
                  style={{ position: "absolute", top: -24, left: 8, color: "var(--orange)", fontWeight: 700, fontSize: 19, whiteSpace: "nowrap" }}
                >
                  your cap ₹{cost.budgetCapLakhs}L
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 44 }}>
              <span className="small">₹0</span>
              <span className="title" style={{ fontSize: 24 }}>
                est. ₹{cost.estimateLakhs}L all-in / yr
              </span>
              <span className="small">₹{cost.axisMaxLakhs}L</span>
            </div>
            <div className="card-tint" style={{ padding: 22, marginTop: 26 }}>
              <div className="small" style={{ fontSize: 23 }}>
                💡 Scholarships worth up to <b style={{ color: "var(--green-d)" }}>₹{cost.scholarshipLakhs}L</b>{" "}
                available — we&apos;ll include them in your kit.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <button
              type="button"
              className={`btn btn-lg ${shortlisted ? "btn-green" : "btn-outline"}`}
              style={{ flex: 1 }}
              onClick={onToggleShortlist}
            >
              {shortlisted ? "Shortlisted" : "♡ Shortlist"}
            </button>
            <button type="button" className="btn btn-ghost btn-lg" style={{ flex: 1 }} onClick={onOpenDocuments}>
              View documents
            </button>
            <button type="button" className="btn btn-blue btn-lg" style={{ flex: 1.6 }} onClick={onOpenDocuments}>
              Apply now →
            </button>
          </div>
        </div>
      </div>
    </KioskFrame>
  );
}

function DocumentsScreen({
  profile,
  shortlistIds,
  recommendations,
  handoffBusy,
  onBack,
  onSendKit,
}: {
  profile: KioskProfile;
  shortlistIds: number[];
  recommendations: KioskRecommendation[];
  handoffBusy: boolean;
  onBack: () => void;
  onSendKit: () => void;
}) {
  const shortlisted =
    shortlistIds.length > 0
      ? recommendations.filter((item) => shortlistIds.includes(item.id))
      : recommendations.slice(0, 3);
  const documents: KioskDocument[] = buildDocumentChecklist(profile);
  const readyCount = documents.filter((doc) => doc.status === "ready").length;
  const actionCount = documents.length - readyCount;
  const sopProgram = shortlisted[0] ?? recommendations[0] ?? null;

  return (
    <KioskFrame label="SUB · SHORTLIST & DOCUMENTS">
      <TopBar
        small
        right={
          <button type="button" className="blue-text link-reset" style={{ fontWeight: 700, fontSize: 24 }} onClick={onBack}>
            ← Back to results
          </button>
        }
      />

      <div style={{ flex: 1, display: "flex", gap: 44, padding: "4px 64px 44px", minHeight: 0, overflowY: "auto" }}>
        <div style={{ flex: "1 1 56%", display: "flex", flexDirection: "column" }}>
          <div className="h1" style={{ fontSize: 48 }}>Your shortlist &amp; documents</div>

          <div className="eyebrow" style={{ margin: "26px 0 14px" }}>
            ♡ {shortlisted.length} shortlisted program{shortlisted.length === 1 ? "" : "s"}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {shortlisted.map((item) => (
              <div key={item.id} className="card" style={{ flex: 1, minWidth: 220, padding: 20, display: "flex", alignItems: "center", gap: 14 }}>
                <div className="uni-logo">▲</div>
                <div>
                  <div className="title" style={{ fontSize: 23 }}>{item.university}</div>
                  <div className="status status-green" style={{ fontSize: 19 }}>
                    <span className="dot dot-green" />
                    {item.score}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ margin: "28px 0 14px" }}>
            {readyCount} documents ready{actionCount > 0 ? ` · ${actionCount} needs you` : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            {documents.map((doc) => {
              const ok = doc.status === "ready";
              return (
                <div
                  key={doc.id}
                  className="card"
                  style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "52px 1fr auto auto", alignItems: "center", gap: 18 }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: ok ? "var(--blue-tint)" : "var(--orange-tint)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: ok ? "var(--blue)" : "var(--orange)",
                      fontWeight: 800,
                      fontSize: 20,
                    }}
                  >
                    PDF
                  </div>
                  <div>
                    <div className="title" style={{ fontSize: 26 }}>{doc.title}</div>
                    <div className="small" style={{ fontSize: 20 }}>{doc.subtitle}</div>
                  </div>
                  <span
                    className="chip"
                    style={{
                      background: ok ? "var(--green-tint)" : "var(--orange-tint)",
                      color: ok ? "var(--green-d)" : "var(--orange)",
                      borderColor: "transparent",
                      fontSize: 19,
                    }}
                  >
                    <span className="dot" style={{ background: ok ? "var(--green)" : "var(--orange)" }} />
                    {ok ? "Ready" : "Action needed"}
                  </span>
                  <span className="blue-text" style={{ fontWeight: 700, fontSize: 22 }}>
                    {ok ? "Open" : "Upload"} ›
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: "1 1 44%", display: "flex", flexDirection: "column" }}>
          <div className="body" style={{ fontSize: 27, color: "var(--ink-2)", marginTop: 8 }}>
            Drafted by Cybrik AI. Tap any document to read, edit, or regenerate before sending.
          </div>

          <div className="card" style={{ padding: 30, marginTop: 24, background: "var(--bg-2)", flex: 1 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Preview · SOP</div>
            <div className="body" style={{ fontSize: 26, lineHeight: 1.55, color: "var(--ink-2)" }}>
              {sopProgram ? buildSopPreview(profile, sopProgram) : "Build a profile and pick a program to preview your SOP."}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 26, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 23, padding: "16px 24px" }}>↻ Regenerate</button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 23, padding: "16px 24px" }}>✎ Edit tone</button>
              <button type="button" className="btn btn-outline" style={{ fontSize: 23, padding: "16px 24px" }}>Open full document</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
            <button type="button" className="btn btn-outline btn-lg" style={{ flex: 1 }}>↑ Upload transcript</button>
            <button
              type="button"
              className="btn btn-green btn-lg"
              style={{ flex: 1.4 }}
              disabled={handoffBusy}
              onClick={onSendKit}
            >
              {handoffBusy ? "Preparing handoff..." : "Send all to WhatsApp →"}
            </button>
          </div>
        </div>
      </div>
    </KioskFrame>
  );
}

function HandoffResultScreen({
  receipt,
  autoResetSeconds,
  onDone,
}: {
  receipt: KioskHandoffReceipt;
  autoResetSeconds: number;
  onDone: () => void;
}) {
  return (
    <KioskFrame label="06 · WHATSAPP HANDOFF">
      <TopBar />

      <div className="stage" style={{ gap: 100, alignItems: "center" }}>
        <div style={{ flex: "1 1 48%" }}>
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: "var(--green-tint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 70,
              color: "var(--green-d)",
            }}
          >
            ✓
          </div>
          <div className="h1" style={{ marginTop: 30 }}>
            Sent to your
            <br />
            WhatsApp!
          </div>
          <div className="body" style={{ fontSize: 31, marginTop: 20, maxWidth: 620 }}>
            Everything&apos;s on its way to{" "}
            <b style={{ color: "var(--navy)" }}>{receipt.sentTo}</b>. A counsellor will call you
            within {receipt.etaMinutes} minutes.
          </div>

          <div style={{ marginTop: 40, maxWidth: 620 }}>
            {[
              ["Lead saved to partner CRM", 1],
              ["Documents packaged", 1],
              ["Delivered on WhatsApp", 1],
              ["Counsellor notified", receipt.crmStatus === "sent" ? 1 : 0],
            ].map(([text, done], index) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  borderBottom: index < 3 ? "1.5px solid var(--line)" : "none",
                }}
              >
                <span className="body" style={{ fontSize: 26, color: "var(--navy)" }}>
                  {text}
                </span>
                <span
                  className="small"
                  style={{
                    fontWeight: 700,
                    color: done ? "var(--green-d)" : "var(--blue)",
                  }}
                >
                  {done ? "✓ done" : "◌ sending…"}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-navy btn-xl"
            style={{ marginTop: 40, padding: "30px 80px" }}
            onClick={onDone}
          >
            Done
          </button>
          <div className="small" style={{ marginTop: 14, fontSize: 20 }}>
            Kiosk resets automatically in {formatSeconds(autoResetSeconds)}.
          </div>
        </div>

        <div style={{ flex: "1 1 52%", display: "flex", justifyContent: "center" }}>
          <div
            className="card"
            style={{ width: 640, padding: 30, background: "#F0F8EE", borderColor: "#CDE8C2" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                paddingBottom: 18,
                borderBottom: "1.5px solid #CDE8C2",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 26,
                }}
              >
                C
              </div>
              <div>
                <div className="title" style={{ fontSize: 24 }}>
                  Cybrik
                </div>
                <div className="status status-green" style={{ fontSize: 19 }}>
                  <span className="dot dot-green" />
                  online
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 20 }}>
              {[
                `Hi 👋 Here are your ${receipt.deliveredPrograms} program matches.`,
                "📎 cybrik-matches.pdf",
                `📎 ${receipt.deliveredDocuments.join(", ")}`,
                "Reply YES to begin your applications.",
              ].map((message) => (
                <div
                  key={message}
                  style={{
                    alignSelf: "flex-start",
                    background: "#fff",
                    border: "1.5px solid #D8EBCF",
                    borderRadius: 16,
                    padding: "16px 22px",
                    fontSize: 25,
                    color: "var(--navy)",
                    fontWeight: 500,
                    maxWidth: "92%",
                  }}
                >
                  {message}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </KioskFrame>
  );
}

