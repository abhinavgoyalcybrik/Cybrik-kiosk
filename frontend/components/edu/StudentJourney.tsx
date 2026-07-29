"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AuthApiError,
  autosaveAuthProfile,
  getAuthSession,
  logoutAuthSession,
  sendSessionOtp,
  startAuthSession,
  verifySessionOtp,
} from "@/lib/auth";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Globe,
  Graduation,
  Heart,
  MapPin,
  Search,
  Shield,
  Spark,
  User,
  Wallet,
} from "./Icons";

type Stage = "auth" | "otp" | "profile" | "matches" | "documents" | "complete";
type University = {
  id: number;
  code: string;
  university: string;
  course: string;
  city: string;
  country: string;
  fee: number;
  duration: string;
  intake: string;
  base: number;
  scholarship: string;
  rank: string;
  reasons: string[];
};

const universities: University[] = [
  {
    id: 1,
    code: "RMIT",
    university: "RMIT University",
    course: "Master of Data Science",
    city: "Melbourne",
    country: "Australia",
    fee: 28.4,
    duration: "2 years",
    intake: "Feb 2027",
    base: 96,
    scholarship: "₹6.5L available",
    rank: "Top 125 globally",
    reasons: [
      "Academics exceed entry criteria",
      "Within your tuition range",
      "Preferred city match",
    ],
  },
  {
    id: 2,
    code: "UQ",
    university: "University of Queensland",
    course: "Master of Business Analytics",
    city: "Brisbane",
    country: "Australia",
    fee: 31.2,
    duration: "2 years",
    intake: "Feb 2027",
    base: 92,
    scholarship: "₹8L available",
    rank: "World top 50",
    reasons: [
      "Strong academic alignment",
      "English score qualified",
      "High employability outcomes",
    ],
  },
  {
    id: 3,
    code: "MON",
    university: "Monash University",
    course: "Master of Applied Data Science",
    city: "Melbourne",
    country: "Australia",
    fee: 33.8,
    duration: "2 years",
    intake: "Jul 2027",
    base: 89,
    scholarship: "₹5L available",
    rank: "World top 40",
    reasons: [
      "Course preference match",
      "Preferred destination",
      "Scholarship eligible",
    ],
  },
  {
    id: 4,
    code: "UCD",
    university: "University College Dublin",
    course: "MSc Business Analytics",
    city: "Dublin",
    country: "Ireland",
    fee: 24.6,
    duration: "1 year",
    intake: "Sep 2027",
    base: 86,
    scholarship: "₹3L available",
    rank: "Top 200 globally",
    reasons: [
      "Excellent budget fit",
      "Accelerated program",
      "English score qualified",
    ],
  },
  {
    id: 5,
    code: "UBC",
    university: "University of British Columbia",
    course: "Master of Data Science",
    city: "Vancouver",
    country: "Canada",
    fee: 37.5,
    duration: "10 months",
    intake: "Sep 2027",
    base: 83,
    scholarship: "Merit aid available",
    rank: "World top 40",
    reasons: [
      "High course relevance",
      "Strong academic fit",
      "Career-focused curriculum",
    ],
  },
];

const docs = [
  ["Passport", "Identity and visa processing", "ready"],
  ["Academic transcripts", "10th, 12th and undergraduate records", "ready"],
  ["Degree certificate", "Proof of completed qualification", "ready"],
  ["English scorecard", "IELTS / PTE / TOEFL / Duolingo", "ready"],
  ["Statement of purpose", "Your academic goals and motivation", "action"],
  [
    "Letters of recommendation",
    "Two academic or professional references",
    "action",
  ],
  ["Financial evidence", "Tuition and living expense capacity", "action"],
  ["Updated CV", "Academic and work experience", "ready"],
] as const;

export function StudentJourney({
  kiosk = false,
  preferenceKiosk = false,
}: {
  kiosk?: boolean;
  preferenceKiosk?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("auth");
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("Aarav Sharma");
  const [phone, setPhone] = useState("98765 43210");
  const [email, setEmail] = useState("aarav@example.com");
  const [sessionKey, setSessionKey] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);
  const [resendAfter, setResendAfter] = useState(60);
  const [qualification, setQualification] = useState("Bachelor’s degree");
  const [academicScore, setAcademicScore] = useState("8.2 CGPA");
  const [country, setCountry] = useState("Australia");
  const [city, setCity] = useState("Melbourne");
  const [course, setCourse] = useState("Data Science");
  const [budget, setBudget] = useState(35);
  const [test, setTest] = useState("IELTS");
  const [score, setScore] = useState("7.5");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<number[]>([1, 2, 3]);
  const [sort, setSort] = useState("Best match");
  const [toast, setToast] = useState("");

  const matches = useMemo(
    () =>
      universities
        .filter(
          (u) =>
            (!country || u.country === country) &&
            `${u.university} ${u.course} ${u.city}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .map((u) => {
          const academicBonus = parseFloat(academicScore) >= 8 ? 2 : 0;
          const languageScore = parseFloat(score);
          const languageReady =
            test === "IELTS"
              ? languageScore >= 6.5
              : test === "PTE"
                ? languageScore >= 58
                : test === "TOEFL"
                  ? languageScore >= 80
                  : languageScore >= 105;
          return {
            ...u,
            score: Math.max(
              72,
              u.base -
                (budget < u.fee ? 5 : 0) +
                (city === u.city ? 2 : 0) +
                academicBonus -
                (languageReady ? 0 : 6),
            ),
          };
        })
        .sort((a, b) =>
          sort === "Lowest tuition" ? a.fee - b.fee : b.score - a.score,
        ),
    [academicScore, budget, city, country, score, search, sort, test],
  );

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: "easeOut" as const };
  const go = (next: Stage) => {
    setStage(next);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };
  const toggleSave = (id: number) => {
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    notify(
      saved.includes(id) ? "Removed from shortlist" : "Added to your shortlist",
    );
  };
  useEffect(() => {
    let active = true;
    getAuthSession()
      .then((session) => {
        if (!active || !session.authenticated) return;
        setSessionKey(session.session_key);
        setPhone(session.phone);
        setName(session.name || "Student");
        setEmail(session.email || "");
        setStage("profile");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const normalizedPhone = () => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 ? `91${digits}` : digits;
  };
  const beginAuthentication = async () => {
    if (authBusy) return;
    const submittedPhone = normalizedPhone();
    if (!/^\d{8,15}$/.test(submittedPhone)) {
      setAuthError("Enter a valid phone number with its country code.");
      return;
    }
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const session = await startAuthSession({
        mode: authMode,
        name: authMode === "register" ? name : undefined,
        email: authMode === "register" ? email : undefined,
        phone: submittedPhone,
      });
      const delivery = await sendSessionOtp(session.session_key);
      setSessionKey(session.session_key);
      setPhone(session.phone);
      setOtp("");
      setOtpExpiresIn(delivery.expires_in_seconds || 300);
      setResendAfter(delivery.resend_after_seconds || 60);
      setAuthMessage(delivery.message);
      go("otp");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setAuthBusy(false);
    }
  };
  const verifyOtp = async () => {
    if (authBusy || !sessionKey || otp.length !== 6) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await verifySessionOtp(sessionKey, otp);
      setAuthMessage(result.message);
      notify(result.message);
      go("profile");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "OTP verification failed.");
    } finally {
      setAuthBusy(false);
    }
  };
  const resendOtp = async () => {
    if (authBusy || !sessionKey) return null;
    setAuthBusy(true);
    setAuthError("");
    try {
      const result = await sendSessionOtp(sessionKey);
      setOtpExpiresIn(result.expires_in_seconds || 300);
      setResendAfter(result.resend_after_seconds || 60);
      setAuthMessage("OTP resent successfully.");
      notify("OTP resent successfully.");
      return result;
    } catch (error) {
      if (error instanceof AuthApiError && error.retryAfter) {
        setResendAfter(error.retryAfter);
      }
      setAuthError(error instanceof Error ? error.message : "Unable to resend OTP.");
      return null;
    } finally {
      setAuthBusy(false);
    }
  };
  const changePhone = () => {
    setOtp("");
    setSessionKey("");
    setAuthError("");
    setAuthMessage("");
    go("auth");
  };
  const handleLogout = async () => {
    try {
      await logoutAuthSession();
    } finally {
      setSessionKey("");
      setOtp("");
      window.location.href = "/";
    }
  };
  const saveProfileAndContinue = async () => {
    if (!sessionKey || authBusy) return;
    setAuthBusy(true);
    try {
      await autosaveAuthProfile(sessionKey, {
        preferred_countries: [country],
        preferred_cities: [city],
        preferred_course: course,
        qualification,
        academic_score: academicScore,
        budget_lakhs: budget,
        english_test: test,
        english_score: score,
      });
      go("matches");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <main
      className={`journey-app ${kiosk ? "kiosk-mode" : ""} ${preferenceKiosk ? "preference-kiosk" : ""}`}
    >
      <a className="skip-link" href="#journey-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link href="/" aria-label="Cybrik Solutions home">
          <Image
            src="/cybrik-logo.png"
            alt="Cybrik Solutions"
            width={620}
            height={180}
            priority
          />
        </Link>
        <div className="app-help">
          {kiosk && <span className="kiosk-badge">43″ guided kiosk</span>}
          <span className="secure">
            <Shield size={16} /> Secure session
          </span>
          <button className="auth-exit" type="button" onClick={handleLogout}>Exit</button>
        </div>
      </header>
      <AnimatePresence mode="wait">
        <motion.div
          id="journey-content"
          key={stage}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
          transition={transition}
        >
          {stage === "auth" && (
            <AuthScreen
              mode={authMode}
              name={name}
              setName={setName}
              phone={phone}
              setPhone={setPhone}
              email={email}
              setEmail={setEmail}
              busy={authBusy}
              error={authError}
              onNext={beginAuthentication}
              onModeChange={(mode) => {
                setAuthMode(mode);
                setAuthError("");
              }}
            />
          )}
          {stage === "otp" && (
            <OtpScreen
              otp={otp}
              setOtp={setOtp}
              phone={phone}
              busy={authBusy}
              error={authError}
              message={authMessage}
              expiresIn={otpExpiresIn}
              resendAfter={resendAfter}
              onBack={changePhone}
              onNext={verifyOtp}
              onResend={resendOtp}
            />
          )}
          {stage === "profile" && (
            <ProfileScreen
              name={name}
              country={country}
              setCountry={setCountry}
              city={city}
              setCity={setCity}
              course={course}
              setCourse={setCourse}
              budget={budget}
              setBudget={setBudget}
              test={test}
              setTest={setTest}
              score={score}
              setScore={setScore}
              onNext={saveProfileAndContinue}
            />
          )}
          {stage === "matches" && (
            <MatchesScreen
              matches={matches}
              saved={saved}
              search={search}
              setSearch={setSearch}
              sort={sort}
              setSort={setSort}
              toggleSave={toggleSave}
              onEdit={() => go("profile")}
              onNext={() => go("documents")}
              qualification={qualification}
              setQualification={setQualification}
              academicScore={academicScore}
              setAcademicScore={setAcademicScore}
              country={country}
              setCountry={setCountry}
              city={city}
              setCity={setCity}
              course={course}
              setCourse={setCourse}
              budget={budget}
              setBudget={setBudget}
              test={test}
              setTest={setTest}
              score={score}
              setScore={setScore}
            />
          )}
          {stage === "documents" && (
            <DocumentsScreen
              saved={saved}
              toggleSave={toggleSave}
              onBack={() => go("matches")}
              onComplete={() => go("complete")}
            />
          )}
          {stage === "complete" && (
            <CompleteScreen
              name={name}
              saved={saved.length}
              onDone={() => {
                setStage("auth");
                setOtp("");
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Check size={18} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function AuthScreen({
  mode,
  onModeChange,
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  busy,
  error,
  onNext,
}: {
  mode: "register" | "login";
  onModeChange: (v: "register" | "login") => void;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  busy: boolean;
  error: string;
  onNext: () => Promise<void>;
}) {
  return (
    <section className="auth-layout">
      <div className="auth-form-wrap">
        <form
          className="form-card"
          onSubmit={(e) => {
            e.preventDefault();
            onNext();
          }}
        >
          <div className="form-tabs">
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => onModeChange("register")}
            >
              Create account
            </button>
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => onModeChange("login")}
            >
              Sign in
            </button>
          </div>
          <h2>
            {mode === "register" ? "Let’s get to know you" : "Welcome back"}
          </h2>
          <p>
            {mode === "register"
              ? "Your details help us personalize your experience."
              : "Continue building your global education plan."}
          </p>
          {mode === "register" && (
            <Field label="Full name">
              <User />
              <input
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          )}
          <Field label="Mobile number">
            <span className="prefix">+91</span>
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={Boolean(error && error.toLowerCase().includes("phone"))}
            />
          </Field>
          {mode === "register" && (
            <Field label="Email address">
              <span className="at">@</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="button button-full button-lg" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "register" ? "Create my account" : "Send login code"}
            <ArrowRight />
          </button>
          <small className="form-note">
            <Shield size={15} /> We’ll verify your mobile with a secure one-time
            code.
          </small>
        </form>
      </div>
    </section>
  );
}

function OtpScreen({
  otp,
  setOtp,
  phone,
  busy,
  error,
  message,
  expiresIn,
  resendAfter,
  onBack,
  onNext,
  onResend,
}: {
  otp: string;
  setOtp: (v: string) => void;
  phone: string;
  busy: boolean;
  error: string;
  message: string;
  expiresIn: number;
  resendAfter: number;
  onBack: () => void;
  onNext: () => Promise<void>;
  onResend: () => Promise<
    { expires_in_seconds: number; resend_after_seconds: number } | null
  >;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [expirySeconds, setExpirySeconds] = useState(expiresIn);
  const [resendSeconds, setResendSeconds] = useState(resendAfter);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpirySeconds((value) => Math.max(0, value - 1));
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const updateDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = otp.padEnd(6, " ").split("");
    next[index] = digit || " ";
    setOtp(next.join("").replace(/\s/g, "").slice(0, 6));
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setOtp(pasted);
    inputsRef.current[Math.min(pasted.length, 6) - 1]?.focus();
  };
  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <section className="center-screen otp-screen">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft /> Back
      </button>
      <div className="otp-card">
        <div className="success-icon">
          <Shield />
        </div>
        <span className="kicker">Secure verification</span>
        <h1>Check your phone</h1>
        <p>
          We sent a 6-digit code to <strong>+{phone}</strong>
        </p>
        <fieldset className="otp-digit-group">
          <legend>One-time code</legend>
          <div>
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={(element) => { inputsRef.current[index] = element; }}
                autoFocus={index === 0}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`OTP digit ${index + 1}`}
                maxLength={1}
                value={otp[index] || ""}
                onChange={(event) => updateDigit(index, event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !otp[index] && index > 0) {
                    inputsRef.current[index - 1]?.focus();
                  }
                }}
              />
            ))}
          </div>
        </fieldset>
        <div className="otp-timer" role="timer">
          {expirySeconds > 0 ? `Code expires in ${formatTime(expirySeconds)}` : "Code expired. Request a new OTP."}
        </div>
        {message && !error && <div className="auth-success" role="status">{message}</div>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button
          className="button button-full button-lg"
          disabled={busy || otp.length !== 6 || expirySeconds === 0}
          onClick={onNext}
        >
          {busy ? "Verifying…" : "Verify OTP"} <ArrowRight />
        </button>
        <div className="otp-actions">
          <button className="resend" disabled={busy || resendSeconds > 0} onClick={async () => {
            const result = await onResend();
            if (result) {
              setOtp("");
              setExpirySeconds(result.expires_in_seconds);
              setResendSeconds(result.resend_after_seconds);
              inputsRef.current[0]?.focus();
            }
          }}>
            {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : "Resend OTP"}
          </button>
          <button className="resend" disabled={busy} onClick={onBack}>Change phone number</button>
        </div>
      </div>
    </section>
  );
}

function ProfileScreen({
  name,
  country,
  setCountry,
  city,
  setCity,
  course,
  setCourse,
  budget,
  setBudget,
  test,
  setTest,
  score,
  setScore,
  onNext,
}: {
  name: string;
  country: string;
  setCountry: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  course: string;
  setCourse: (v: string) => void;
  budget: number;
  setBudget: (v: number) => void;
  test: string;
  setTest: (v: string) => void;
  score: string;
  setScore: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <section className="profile-page">
      <div className="page-intro">
        <span className="kicker">Hello, {name.split(" ")[0]}</span>
        <h1>Build your student profile</h1>
        <p>
          A few details help us remove ineligible programs and rank the options
          that genuinely fit.
        </p>
      </div>
      <form
        className="profile-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onNext();
        }}
      >
        <ProfileSection
          icon={<Graduation />}
          title="Academic background"
          note="Your most recent qualifications"
        >
          <div className="input-grid">
            <Select
              label="Highest qualification"
              defaultValue="Bachelor’s degree"
              options={["Bachelor’s degree", "Master’s degree", "Diploma"]}
            />
            <FieldPlain label="Degree / specialization">
              <input defaultValue="B.Tech Computer Science" />
            </FieldPlain>
            <Select
              label="10th score"
              defaultValue="88%"
              options={["88%", "80%", "75%"]}
            />
            <Select
              label="12th score"
              defaultValue="84%"
              options={["84%", "80%", "75%"]}
            />
            <Select
              label="12th board"
              defaultValue="CBSE"
              options={["CBSE", "ICSE", "State Board"]}
            />
            <Select
              label="UG score"
              defaultValue="8.2 CGPA"
              options={["8.2 CGPA", "7.5 CGPA", "70%"]}
            />
          </div>
        </ProfileSection>
        <ProfileSection
          icon={<Globe />}
          title="Study preferences"
          note="Where and what you’d like to study"
        >
          <div className="input-grid">
            <Select
              label="Preferred country"
              value={country}
              onChange={setCountry}
              options={["Australia", "Canada", "Ireland"]}
            />
            <Select
              label="Preferred city"
              value={city}
              onChange={setCity}
              options={
                country === "Australia"
                  ? ["Melbourne", "Sydney", "Brisbane"]
                  : country === "Canada"
                    ? ["Vancouver", "Toronto"]
                    : ["Dublin"]
              }
            />
            <FieldPlain label="Preferred course">
              <input
                value={course}
                onChange={(e) => setCourse(e.target.value)}
              />
            </FieldPlain>
            <FieldPlain label="Preferred university (optional)">
              <input placeholder="Any university" />
            </FieldPlain>
          </div>
        </ProfileSection>
        <ProfileSection
          icon={<Spark />}
          title="English proficiency"
          note="Your latest valid test score"
        >
          <div className="input-grid two">
            <Select
              label="Test type"
              value={test}
              onChange={setTest}
              options={["IELTS", "PTE", "TOEFL", "Duolingo"]}
            />
            <FieldPlain label={`${test} score`}>
              <input
                value={score}
                onChange={(e) => setScore(e.target.value)}
                inputMode="decimal"
              />
            </FieldPlain>
          </div>
        </ProfileSection>
        <ProfileSection
          icon={<Wallet />}
          title="Tuition budget"
          note="Your preferred annual tuition range"
        >
          <div className="budget-control">
            <div>
              <span>₹5 lakhs</span>
              <strong>Up to ₹{budget} lakhs / year</strong>
              <span>₹60 lakhs</span>
            </div>
            <input
              aria-label="Maximum annual tuition budget"
              type="range"
              min="5"
              max="60"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
        </ProfileSection>
        <div className="profile-actions">
          <span>
            <Shield size={17} /> Your profile auto-saves on this device
          </span>
          <button className="button button-lg" type="submit">
            Show my matches <ArrowRight />
          </button>
        </div>
      </form>
    </section>
  );
}

function MatchesScreen({
  matches,
  saved,
  search,
  setSearch,
  sort,
  setSort,
  toggleSave,
  onEdit,
  onNext,
  qualification,
  setQualification,
  academicScore,
  setAcademicScore,
  country,
  setCountry,
  city,
  setCity,
  course,
  setCourse,
  budget,
  setBudget,
  test,
  setTest,
  score,
  setScore,
}: {
  matches: (University & { score: number })[];
  saved: number[];
  search: string;
  setSearch: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  toggleSave: (id: number) => void;
  onEdit: () => void;
  onNext: () => void;
  qualification: string;
  setQualification: (v: string) => void;
  academicScore: string;
  setAcademicScore: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  course: string;
  setCourse: (v: string) => void;
  budget: number;
  setBudget: (v: number) => void;
  test: string;
  setTest: (v: string) => void;
  score: string;
  setScore: (v: string) => void;
}) {
  const [openPreference, setOpenPreference] = useState<string | null>(null);
  const preferencesRef = useRef<HTMLElement>(null);
  const cityOptions = country === "Australia" ? ["Melbourne", "Sydney", "Brisbane"] : country === "Canada" ? ["Vancouver", "Toronto"] : ["Dublin"];
  const changeCountry = (nextCountry: string) => {
    setCountry(nextCountry);
    setCity(nextCountry === "Australia" ? "Melbourne" : nextCountry === "Canada" ? "Vancouver" : "Dublin");
  };
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        openPreference &&
        !preferencesRef.current?.contains(event.target as Node)
      ) {
        setOpenPreference(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPreference(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openPreference]);
  return (
    <section className="matches-page">
      <aside className="filter-panel" ref={preferencesRef}>
        <div className="preference-toolbar-head">
          <div>
            <span className="kicker">Your preferences</span>
            <h2>Shape your results</h2>
          </div>
          <button className="edit-profile" onClick={onEdit}>
            Edit full profile <ArrowRight size={17} />
          </button>
        </div>
        <div className="preference-toolbar-scroll">
          <div className="preference-toolbar">
            <PreferenceEditor
              icon={<Graduation />}
              label="Academics"
              value={`${qualification} · ${academicScore}`}
              open={openPreference === "academics"}
              onToggle={() => setOpenPreference(openPreference === "academics" ? null : "academics")}
            >
              <Select label="Qualification" value={qualification} onChange={(value) => { setQualification(value); setOpenPreference(null); }} options={["Bachelor’s degree", "Master’s degree", "Diploma"]} />
              <Select label="Latest score" value={academicScore} onChange={(value) => { setAcademicScore(value); setOpenPreference(null); }} options={["8.2 CGPA", "7.5 CGPA", "7.0 CGPA"]} />
            </PreferenceEditor>
            <PreferenceEditor
              icon={<Globe />}
              label="Destination"
              value={`${country} · ${city}`}
              open={openPreference === "destination"}
              onToggle={() => setOpenPreference(openPreference === "destination" ? null : "destination")}
            >
              <Select label="Country" value={country} onChange={(value) => { changeCountry(value); setOpenPreference(null); }} options={["Australia", "Canada", "Ireland"]} />
              <Select label="City" value={city} onChange={(value) => { setCity(value); setOpenPreference(null); }} options={cityOptions} />
              <FieldPlain label="Course"><input value={course} onChange={(event) => setCourse(event.target.value)} onBlur={() => setOpenPreference(null)} /></FieldPlain>
            </PreferenceEditor>
            <PreferenceEditor icon={<Spark />} label="English" value={`${test} · ${score}`} open={openPreference === "english"} onToggle={() => setOpenPreference(openPreference === "english" ? null : "english")}>
              <Select label="Test" value={test} onChange={(value) => { setTest(value); setOpenPreference(null); }} options={["IELTS", "PTE", "TOEFL", "Duolingo"]} />
              <FieldPlain label={`${test} score`}><input inputMode="decimal" value={score} onChange={(event) => setScore(event.target.value)} onBlur={() => setOpenPreference(null)} /></FieldPlain>
            </PreferenceEditor>
            <PreferenceEditor
              icon={<Wallet />}
              label="Tuition"
              value={`Up to ₹${budget}L/year`}
              open={openPreference === "tuition"}
              onToggle={() => setOpenPreference(openPreference === "tuition" ? null : "tuition")}
            >
              <label className="inline-budget"><span>Maximum annual tuition</span><strong>₹{budget}L</strong><input aria-label="Maximum annual tuition" type="range" min="5" max="60" value={budget} onChange={(event) => setBudget(Number(event.target.value))} onPointerUp={() => setOpenPreference(null)} /></label>
            </PreferenceEditor>
            <div className="preferences-live"><span aria-hidden="true" /> Results update automatically</div>
          </div>
        </div>
      </aside>
        <div className="results-head">
          <div>
            <span className="kicker">Personalized for you</span>
            <h1>{matches.length} eligible programs found</h1>
            <p>
              Sorted by how well each course fits your profile and preferences.
            </p>
          </div>
          <div className="shortlist-count">
            <Heart />
            <strong>{saved.length}</strong>
            <span>shortlisted</span>
          </div>
        </div>
        <div className="result-tools">
          <label className="search-box">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search university, course, or city"
            />
          </label>
          <label className="sort-box">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option>Best match</option>
              <option>Lowest tuition</option>
            </select>
            <ChevronDown />
          </label>
        </div>
        <div className="result-list">
          {matches.map((u, index) => (
            <article className="result-card" key={u.id}>
              <div className="result-rank">#{index + 1}</div>
              <div
                className={`uni-mark large ${["blue", "green", "amber"][index % 3]}`}
              >
                {u.code}
              </div>
              <div className="result-main">
                <div className="result-title">
                  <div>
                    <span>{u.rank}</span>
                    <h3>{u.university}</h3>
                    <p>{u.course}</p>
                  </div>
                  <div className="match-score">
                    <strong>{u.score}%</strong>
                    <span>profile match</span>
                  </div>
                </div>
                <div className="result-meta">
                  <span>
                    <MapPin />
                    {u.city}, {u.country}
                  </span>
                  <span>
                    <Wallet />₹{u.fee}L / year
                  </span>
                  <span>
                    <Graduation />
                    {u.duration}
                  </span>
                  <span>
                    <Globe />
                    {u.intake}
                  </span>
                </div>
                <div className="why-fit">
                  <strong>Why this fits</strong>
                  {u.reasons.map((r) => (
                    <span key={r}>
                      <Check />
                      {r}
                    </span>
                  ))}
                </div>
                <div className="result-bottom">
                  <span className="scholarship">
                    <Spark />
                    {u.scholarship}
                  </span>
                  <div>
                    <button
                      className={`save-button ${saved.includes(u.id) ? "saved" : ""}`}
                      onClick={() => toggleSave(u.id)}
                      aria-label={`${saved.includes(u.id) ? "Remove" : "Add"} ${u.university} ${saved.includes(u.id) ? "from" : "to"} shortlist`}
                    >
                      <Heart />
                      {saved.includes(u.id) ? "Shortlisted" : "Shortlist"}
                    </button>
                    <Link
                      className="button button-sm"
                      href={`/course/${u.id}`}
                    >
                      View course <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {matches.length === 0 && (
            <div className="empty-state">
              <Search size={32} />
              <h3>No exact matches found</h3>
              <p>
                Try a broader search or update your destination preferences.
              </p>
              <button
                className="button button-sm"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
        <div className="sticky-next">
          <div>
            <strong>
              {saved.length} program{saved.length === 1 ? "" : "s"} shortlisted
            </strong>
            <span>Ready to build your personalized document plan?</span>
          </div>
          <button
            className="button button-lg"
            disabled={!saved.length}
            onClick={onNext}
          >
            Continue to documents <ArrowRight />
          </button>
        </div>
    </section>
  );
}

function DocumentsScreen({
  saved,
  onBack,
  onComplete,
}: {
  saved: number[];
  toggleSave: (id: number) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const selected = universities.filter((u) => saved.includes(u.id));
  const ready = docs.filter((d) => d[2] === "ready").length;
  return (
    <section className="documents-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft /> Back to matches
      </button>
      <div className="documents-head">
        <div>
          <span className="kicker">Your personalized plan</span>
          <h1>
            Everything you’ll need,
            <br />
            organized in one place.
          </h1>
          <p>
            Built from your {selected.length} shortlisted programs and
            destination requirements.
          </p>
        </div>
        <div className="readiness">
          <div className="readiness-ring">
            <strong>{Math.round((ready / docs.length) * 100)}%</strong>
            <span>ready</span>
          </div>
          <div>
            <strong>
              {ready} of {docs.length} documents
            </strong>
            <span>You’re making great progress</span>
          </div>
        </div>
      </div>
      <div className="document-layout">
        <div>
          <div className="section-bar">
            <h2>Admission documents</h2>
            <span>{docs.length} items</span>
          </div>
          <div className="document-list">
            {docs.map(([title, description, status]) => (
              <article key={title} className="document-row">
                <div className={`doc-icon ${status}`}>
                  <FileText />
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className={`doc-status ${status}`}>
                  {status === "ready" ? (
                    <>
                      <Check />
                      Ready
                    </>
                  ) : (
                    "Action needed"
                  )}
                </span>
                <button onClick={() => {}}>
                  {status === "ready" ? "View" : "Start"}
                  <ArrowRight />
                </button>
              </article>
            ))}
          </div>
        </div>
        <aside className="plan-summary">
          <span className="kicker">Plan summary</span>
          <h2>Your shortlisted routes</h2>
          {selected.map((u) => (
            <div className="route-summary" key={u.id}>
              <div className="uni-mark blue">{u.code}</div>
              <div>
                <strong>{u.university}</strong>
                <span>{u.course}</span>
                <small>
                  {u.city} · {u.intake}
                </small>
              </div>
            </div>
          ))}
          <hr />
          <div className="visa-note">
            <Shield />
            <div>
              <strong>Visa requirements included</strong>
              <p>
                Australia-specific financial, health, and identity documents are
                part of this plan.
              </p>
            </div>
          </div>
          <button className="button button-full button-lg" onClick={onComplete}>
            Save and complete <ArrowRight />
          </button>
          <small className="plan-note">
            This demo stores your choices only for the current session.
          </small>
        </aside>
      </div>
    </section>
  );
}

function CompleteScreen({
  name,
  saved,
  onDone,
}: {
  name: string;
  saved: number;
  onDone: () => void;
}) {
  return (
    <section className="complete-screen">
      <div className="complete-card">
        <div className="complete-check">
          <Check size={34} />
        </div>
        <span className="kicker">Journey saved</span>
        <h1>You have a plan, {name.split(" ")[0]}.</h1>
        <p>
          Your {saved} shortlisted programs and personalized document checklist
          are ready for your next step.
        </p>
        <div className="complete-stats">
          <div>
            <strong>{saved}</strong>
            <span>Programs saved</span>
          </div>
          <div>
            <strong>{docs.length}</strong>
            <span>Documents planned</span>
          </div>
          <div>
            <strong>Feb ’27</strong>
            <span>Target intake</span>
          </div>
        </div>
        <div className="complete-note">
          <Spark />
          <div>
            <strong>What happens next?</strong>
            <p>
              A Cybrik advisor can review your shortlist and help turn your
              document plan into applications.
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="button button-full button-lg"
          onClick={onDone}
        >
          Return to Cybrik home <ArrowRight />
        </Link>
        <button className="text-button" onClick={onDone}>
          Start another journey
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field-wrap">
      <span>{label}</span>
      <div className="field-shell">{children}</div>
    </label>
  );
}
function FieldPlain({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="plain-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Select({
  label,
  options,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
}) {
  return (
    <label className="plain-field">
      <span>{label}</span>
      <div className="select-wrap">
        <select
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={(e) => onChange?.(e.target.value)}
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <ChevronDown />
      </div>
    </label>
  );
}
function ProfileSection({
  icon,
  title,
  note,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="profile-section">
      <legend>
        <span>{icon}</span>
        <span>
          <strong>{title}</strong>
          <small>{note}</small>
        </span>
      </legend>
      {children}
    </fieldset>
  );
}
function PreferenceEditor({
  icon,
  label,
  value,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`preference-editor ${open ? "open" : ""}`}>
      <button className="filter-summary" type="button" aria-expanded={open} onClick={onToggle}>
        <span>{icon}</span>
        <div>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
        <ChevronDown />
      </button>
      <div className="preference-editor-body" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
