import type { StudentProfile } from "@/hooks/useRecommendations";
import { fetchCoursesCatalog } from "@/lib/api";
import { buildProfileSignalChips, buildShortlistCards } from "@/lib/shortlist";
import type { CourseCatalogApiItem, CourseCardItem } from "@/lib/types";
import { resolveUniversityLogoUrl } from "@/lib/universityLogo";

import type {
  KioskCostBreakdown,
  KioskDocument,
  KioskHandoffReceipt,
  KioskOtpVerifyResponse,
  KioskProfile,
  KioskRecommendation,
  KioskRecommendationBundle,
  KioskSessionStartResponse,
  KioskSessionState,
} from "./types";

const INR_PER_UNIT: Record<string, number> = {
  CAD: 6.1,
  USD: 8.3,
  GBP: 10.6,
  AUD: 5.5,
  NZD: 5.0,
  EUR: 9.0,
  INR: 1,
};

function convertToLakhs(amount: number, currency: string): number {
  const rate = INR_PER_UNIT[currency] ?? 7;
  return (amount * rate) / 100000;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const NETWORK_LATENCY_MS = 500;
const DEMO_DEVICE_ID = "kiosk-lobby-01";

type CatalogLoadResult = {
  source: "live_catalog" | "demo_catalog";
  courses: CourseCatalogApiItem[];
};

type MockSessionRecord = {
  session: KioskSessionState;
  otpCode: string;
  verifyAttempts: number;
  profile?: KioskProfile;
};

const mockSessions = new Map<string, MockSessionRecord>();
let catalogPromise: Promise<CatalogLoadResult> | null = null;

const DEMO_COURSES: CourseCatalogApiItem[] = [
  {
    course_id: 9101,
    title: "Master of Computer Science",
    university: {
      name: "University of Toronto",
      official_website: "https://www.utoronto.ca",
      country: "Canada",
      city: "Toronto",
    },
    degree_level: "Masters",
    field_of_study: "Computer Science",
    duration_months: 24,
    tuition_fee: 58680,
    tuition_currency: "CAD",
    fee_period: "per year",
    application_fee: 125,
    application_fee_currency: "CAD",
    intake_labels: ["Sep 2027"],
    ielts_overall: 7,
  },
  {
    course_id: 9102,
    title: "Master of Data Science",
    university: {
      name: "University of British Columbia",
      official_website: "https://www.ubc.ca",
      country: "Canada",
      city: "Vancouver",
    },
    degree_level: "Masters",
    field_of_study: "Data Science",
    duration_months: 16,
    tuition_fee: 52000,
    tuition_currency: "CAD",
    fee_period: "total",
    application_fee: 168,
    application_fee_currency: "CAD",
    intake_labels: ["Sep 2027"],
    ielts_overall: 6.5,
  },
  {
    course_id: 9103,
    title: "MSc Advanced Computing",
    university: {
      name: "Imperial College London",
      official_website: "https://www.imperial.ac.uk",
      country: "United Kingdom",
      city: "London",
    },
    degree_level: "Masters",
    field_of_study: "Computer Science",
    duration_months: 12,
    tuition_fee: 41000,
    tuition_currency: "GBP",
    fee_period: "total",
    application_fee: 80,
    application_fee_currency: "GBP",
    intake_labels: ["Oct 2027"],
    ielts_overall: 7,
  },
  {
    course_id: 9104,
    title: "Master of Cyber Security",
    university: {
      name: "Deakin University",
      official_website: "https://www.deakin.edu.au",
      country: "Australia",
      city: "Melbourne",
    },
    degree_level: "Masters",
    field_of_study: "Cyber Security",
    duration_months: 24,
    tuition_fee: 41800,
    tuition_currency: "AUD",
    fee_period: "per year",
    application_fee: 55,
    application_fee_currency: "AUD",
    intake_labels: ["Jul 2027", "Nov 2027"],
    ielts_overall: 6.5,
  },
  {
    course_id: 9105,
    title: "Bachelor of Software Engineering",
    university: {
      name: "RMIT University",
      official_website: "https://www.rmit.edu.au",
      country: "Australia",
      city: "Melbourne",
    },
    degree_level: "Bachelors",
    field_of_study: "Engineering",
    duration_months: 48,
    tuition_fee: 44160,
    tuition_currency: "AUD",
    fee_period: "per year",
    application_fee: 100,
    application_fee_currency: "AUD",
    intake_labels: ["Feb 2027", "Jul 2027"],
    ielts_overall: 6.5,
  },
  {
    course_id: 9106,
    title: "MSc Business Analytics",
    university: {
      name: "University of Manchester",
      official_website: "https://www.manchester.ac.uk",
      country: "United Kingdom",
      city: "Manchester",
    },
    degree_level: "Masters",
    field_of_study: "Business",
    duration_months: 12,
    tuition_fee: 36000,
    tuition_currency: "GBP",
    fee_period: "total",
    application_fee: 75,
    application_fee_currency: "GBP",
    intake_labels: ["Sep 2027"],
    ielts_overall: 6.5,
  },
  {
    course_id: 9107,
    title: "Bachelor of Commerce",
    university: {
      name: "University of Auckland",
      official_website: "https://www.auckland.ac.nz",
      country: "New Zealand",
      city: "Auckland",
    },
    degree_level: "Bachelors",
    field_of_study: "Commerce",
    duration_months: 36,
    tuition_fee: 39000,
    tuition_currency: "NZD",
    fee_period: "per year",
    application_fee: 0,
    application_fee_currency: "NZD",
    intake_labels: ["Mar 2027", "Jul 2027"],
    ielts_overall: 6,
  },
  {
    course_id: 9108,
    title: "MSc Public Health",
    university: {
      name: "University of Leeds",
      official_website: "https://www.leeds.ac.uk",
      country: "United Kingdom",
      city: "Leeds",
    },
    degree_level: "Masters",
    field_of_study: "Health Sciences",
    duration_months: 12,
    tuition_fee: 31500,
    tuition_currency: "GBP",
    fee_period: "total",
    application_fee: 60,
    application_fee_currency: "GBP",
    intake_labels: ["Sep 2027"],
    ielts_overall: 6.5,
  },
  {
    course_id: 9109,
    title: "Master of Information Technology",
    university: {
      name: "Queensland University of Technology",
      official_website: "https://www.qut.edu.au",
      country: "Australia",
      city: "Brisbane",
    },
    degree_level: "Masters",
    field_of_study: "Computer Science",
    duration_months: 24,
    tuition_fee: 37600,
    tuition_currency: "AUD",
    fee_period: "per year",
    application_fee: 0,
    application_fee_currency: "AUD",
    intake_labels: ["Feb 2027", "Jul 2027"],
    ielts_overall: 6.5,
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function generateSessionId(): string {
  return `ks_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

function generateOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

function formatMaskedPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) {
    return "+91";
  }
  return `+91 ${digits.slice(0, 2)}*** ${digits.slice(6, 10)}`;
}

function formatDisplayPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) {
    return "";
  }
  if (digits.length <= 5) {
    return `+91 ${digits}`;
  }
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`.trim();
}

function formatMoney(
  amount: number | null,
  currency: string,
  feePeriod: string
): string {
  if (amount === null) {
    return "Check portal";
  }

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount);

  const prefix = currency ? `${currency} ` : "";
  return feePeriod ? `${prefix}${formatted} (${feePeriod})` : `${prefix}${formatted}`;
}

function formatDuration(durationMonths: number | null): string {
  if (durationMonths === null) {
    return "Flexible duration";
  }
  if (durationMonths % 12 === 0) {
    const years = durationMonths / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${durationMonths} months`;
}

function toRecommendationProfile(profile: KioskProfile): StudentProfile {
  const preferredFieldSeed =
    profile.preferredFields.length > 0
      ? profile.preferredFields
      : profile.academicTrack
        ? [profile.academicTrack]
        : [];

  const undergradStream =
    profile.academicTrack === "Business" || profile.academicTrack === "Commerce"
      ? "commerce"
      : profile.academicTrack === "Health Sciences"
        ? "medical"
        : profile.academicTrack === "Arts & Humanities"
          ? "arts"
          : "non-medical";

  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: formatDisplayPhone(profile.phone),
    currentCity: "",
    preferredCountries: profile.preferredCountries,
    preferredCities: [],
    preferredFields: preferredFieldSeed,
    preferredUniversity: "",
    preferredIntakeSeason: profile.intakeSeason,
    preferredIntakeYear: profile.intakeYear,
    tenthBoard: "",
    tenthPercentage: "",
    twelfthBoard: profile.studyGoal === "undergraduate" ? "Indian curriculum" : "",
    twelfthPercentage:
      profile.studyGoal === "undergraduate" && profile.scoreMode === "percentage"
        ? profile.academicScore
        : "",
    twelfthYearOfCompletion: "",
    twelfthStream: profile.studyGoal === "undergraduate" ? undergradStream : "",
    graduationDegree:
      profile.studyGoal === "postgraduate" && profile.academicTrack
        ? `Bachelor in ${profile.academicTrack}`
        : "",
    graduationCgpa:
      profile.studyGoal === "postgraduate" && profile.scoreMode === "cgpa"
        ? profile.academicScore
        : "",
    graduationYearOfCompletion: "",
    ieltsOverall: profile.englishExam === "IELTS" ? profile.englishScore : "",
    hasWorkExperience: profile.hasWorkExperience ? "Yes" : "No",
    workExperienceYears: profile.hasWorkExperience ? profile.workExperienceYears : "",
    workIndustry: "",
    gapJustification: "",
    budgetMinLakhs: "0",
    budgetMaxLakhs: String(profile.budgetMaxLakhs),
  };
}

function buildReasons(
  profile: KioskProfile,
  course: CourseCatalogApiItem,
  score: number
): string[] {
  const reasons: string[] = [];

  if (profile.preferredCountries.includes(course.university.country)) {
    reasons.push(`Fits your ${course.university.country} preference`);
  }

  if (
    profile.preferredFields.some((field) =>
      course.field_of_study.toLowerCase().includes(field.toLowerCase())
    )
  ) {
    reasons.push(`Strong alignment with ${course.field_of_study}`);
  }

  if (
    profile.englishExam === "IELTS" &&
    profile.englishScore &&
    course.ielts_overall !== null
  ) {
    const buffer = Number(profile.englishScore) - course.ielts_overall;
    if (Number.isFinite(buffer) && buffer >= 0) {
      reasons.push(`IELTS profile clears the requirement by ${buffer.toFixed(1)}`);
    }
  }

  if (course.tuition_fee !== null && profile.budgetMaxLakhs <= 35) {
    reasons.push("Good value relative to your stated budget");
  }

  if (score >= 80) {
    reasons.push("High confidence match from your current profile");
  }

  return reasons.slice(0, 3);
}

function buildRecommendationFromCard(
  card: CourseCardItem,
  course: CourseCatalogApiItem,
  profile: KioskProfile
): KioskRecommendation {
  const score = card.score ?? 68;
  return {
    id: card.id,
    title: card.title,
    university: card.university,
    logoUrl: card.logoUrl ?? resolveUniversityLogoUrl(card.university, course.university.official_website),
    location: card.location,
    country: course.university.country,
    degreeLevel: card.degreeLevel,
    fieldOfStudy: course.field_of_study,
    tuitionLabel: card.tuition,
    tuitionValue: card.tuitionFeeValue,
    duration: card.duration,
    intakeLabel: card.intake,
    intakeList: course.intake_labels,
    ielts: card.ielts,
    score,
    successLabel: score >= 80 ? "High" : score >= 65 ? "Medium" : "Growing",
    reasons: buildReasons(profile, course, score),
  };
}

function buildFallbackRecommendations(
  courses: CourseCatalogApiItem[],
  profile: KioskProfile
): KioskRecommendation[] {
  return courses.slice(0, 8).map((course, index) => {
    const score = Math.max(62, 88 - index * 4);
    return {
      id: course.course_id,
      title: course.title,
      university: course.university.name,
      logoUrl: resolveUniversityLogoUrl(
        course.university.name,
        course.university.official_website
      ),
      location: `${course.university.city}, ${course.university.country}`,
      country: course.university.country,
      degreeLevel: course.degree_level,
      fieldOfStudy: course.field_of_study,
      tuitionLabel: formatMoney(
        course.tuition_fee,
        course.tuition_currency,
        course.fee_period
      ),
      tuitionValue: course.tuition_fee,
      duration: formatDuration(course.duration_months),
      intakeLabel:
        course.intake_labels.length > 0 ? course.intake_labels.join(", ") : "TBA",
      intakeList: course.intake_labels,
      ielts:
        course.ielts_overall !== null
          ? `${course.ielts_overall} overall`
          : "Requirements vary",
      score,
      successLabel: score >= 80 ? "High" : score >= 65 ? "Medium" : "Growing",
      reasons: buildReasons(profile, course, score),
    };
  });
}

function buildDemoProfilePrefill(phone: string): Partial<KioskProfile> | undefined {
  if (!phone.endsWith("3210")) {
    return undefined;
  }

  return {
    fullName: "Aarav Malhotra",
    email: "aarav.malhotra@example.com",
    studyGoal: "postgraduate",
    academicTrack: "Computer Science",
    preferredCountries: ["Canada", "Australia"],
    preferredFields: ["Computer Science", "Data Science"],
    intakeSeason: "Fall (Aug - Oct)",
    intakeYear: "2027",
    scoreMode: "cgpa",
    academicScore: "8.2",
    englishExam: "IELTS",
    englishScore: "7.5",
    budgetMaxLakhs: 38,
    hasWorkExperience: true,
    workExperienceYears: "2",
  };
}

function assertSession(sessionId: string): MockSessionRecord {
  const record = mockSessions.get(sessionId);
  if (!record) {
    throw new Error("This kiosk session has expired. Please start again.");
  }
  if (record.session.expiresAt <= Date.now()) {
    mockSessions.delete(sessionId);
    throw new Error("Your code expired. Please request a fresh OTP.");
  }
  return record;
}

async function loadCatalog(): Promise<CatalogLoadResult> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      try {
        const result = await fetchCoursesCatalog();
        if (result.courses.length > 0) {
          return {
            source: "live_catalog" as const,
            courses: result.courses,
          };
        }
      } catch {
        // Fall back to bundled demo catalog when backend is unavailable.
      }

      return {
        source: "demo_catalog" as const,
        courses: DEMO_COURSES,
      };
    })();
  }

  return catalogPromise;
}

export function primeKioskCatalog(): void {
  void loadCatalog();
}

export function getKioskDeviceId(): string {
  return DEMO_DEVICE_ID;
}

export async function startKioskSession(
  phone: string,
  deviceId = DEMO_DEVICE_ID
): Promise<KioskSessionStartResponse> {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length !== 10) {
    throw new Error("Enter a valid 10-digit WhatsApp number.");
  }

  await sleep(NETWORK_LATENCY_MS);

  const session: KioskSessionState = {
    sessionId: generateSessionId(),
    deviceId,
    phone: normalizedPhone,
    maskedPhone: formatMaskedPhone(normalizedPhone),
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    demoCode: generateOtpCode(),
    verified: false,
    source: "demo",
  };

  mockSessions.set(session.sessionId, {
    session,
    otpCode: session.demoCode ?? "472985",
    verifyAttempts: 0,
  });

  return session;
}

export async function verifyKioskOtp(
  sessionId: string,
  otpCode: string
): Promise<KioskOtpVerifyResponse> {
  await sleep(NETWORK_LATENCY_MS);

  const record = assertSession(sessionId);
  if (record.verifyAttempts >= 5) {
    throw new Error("Too many incorrect attempts. Please start over.");
  }

  if (otpCode !== record.otpCode) {
    record.verifyAttempts += 1;
    const attemptsLeft = Math.max(0, 5 - record.verifyAttempts);
    throw new Error(
      attemptsLeft > 0
        ? `That code is not correct. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`
        : "Too many incorrect attempts. Please start over."
    );
  }

  record.session = {
    ...record.session,
    verified: true,
    expiresAt: Date.now() + 12 * 60 * 1000,
  };

  return {
    session: record.session,
    profilePrefill: buildDemoProfilePrefill(record.session.phone),
  };
}

export async function resendKioskOtp(
  sessionId: string
): Promise<KioskSessionStartResponse> {
  await sleep(NETWORK_LATENCY_MS);

  const record = assertSession(sessionId);
  const remainingMs = record.session.resendAvailableAt - Date.now();
  if (remainingMs > 0) {
    throw new Error(`Please wait ${Math.ceil(remainingMs / 1000)} seconds before resending.`);
  }

  const nextCode = generateOtpCode();
  record.otpCode = nextCode;
  record.verifyAttempts = 0;
  record.session = {
    ...record.session,
    demoCode: nextCode,
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  };

  return record.session;
}

export async function saveKioskProfile(
  sessionId: string,
  profile: KioskProfile
): Promise<void> {
  await sleep(250);

  const record = assertSession(sessionId);
  record.profile = profile;
}

export async function loadKioskRecommendations(
  sessionId: string,
  profile: KioskProfile
): Promise<KioskRecommendationBundle> {
  await sleep(650);

  const record = assertSession(sessionId);
  record.profile = profile;

  const catalog = await loadCatalog();
  const mappedProfile = toRecommendationProfile(profile);
  const ranked = buildShortlistCards(catalog.courses, mappedProfile, "");
  const coursesById = new Map(
    catalog.courses.map((course) => [course.course_id, course])
  );

  const recommendations =
    ranked.courses.length > 0
      ? ranked.courses.slice(0, 18).flatMap((card) => {
          const sourceCourse = coursesById.get(card.id);
          return sourceCourse
            ? [buildRecommendationFromCard(card, sourceCourse, profile)]
            : [];
        })
      : buildFallbackRecommendations(catalog.courses, profile);

  return {
    source: catalog.source,
    totalPrograms: ranked.totalMatches > 0 ? ranked.totalMatches : recommendations.length,
    profileSignalChips: buildProfileSignalChips(mappedProfile),
    recommendations,
  };
}

export async function completeKioskHandoff(
  sessionId: string,
  shortlistIds: number[],
  recommendations: KioskRecommendation[]
): Promise<KioskHandoffReceipt> {
  await sleep(1100);

  const record = assertSession(sessionId);
  const selectedIds = shortlistIds.length > 0 ? shortlistIds : recommendations.slice(0, 3).map((item) => item.id);
  const deliveredPrograms = recommendations.filter((item) =>
    selectedIds.includes(item.id)
  );

  return {
    channel: "WhatsApp",
    crmStatus: "queued",
    leadReference: `lead_${record.session.sessionId.slice(-6)}`,
    deliveredPrograms: deliveredPrograms.length,
    deliveredDocuments: [
      "Program shortlist PDF",
      "Scholarship note",
      "Checklist for next steps",
    ],
    etaMinutes: 15,
    sentTo: formatDisplayPhone(record.session.phone),
  };
}

export function buildCostBreakdown(
  recommendation: KioskRecommendation,
  budgetMaxLakhs: number
): KioskCostBreakdown {
  const currency = recommendation.tuitionLabel.split(" ")[0] ?? "";
  const estimateLakhs =
    recommendation.tuitionValue !== null
      ? Math.round(convertToLakhs(recommendation.tuitionValue, currency) * 1.18)
      : Math.round(budgetMaxLakhs * 1.1);

  const axisMaxLakhs = Math.max(estimateLakhs, budgetMaxLakhs) * 1.3;
  const capPct = Math.min(100, (budgetMaxLakhs / axisMaxLakhs) * 100);
  const estimatePct = Math.min(100, (estimateLakhs / axisMaxLakhs) * 100);

  return {
    estimateLakhs,
    budgetCapLakhs: budgetMaxLakhs,
    axisMaxLakhs: Math.round(axisMaxLakhs),
    capPct,
    estimatePct,
    overBudget: estimateLakhs > budgetMaxLakhs,
    scholarshipLakhs: Math.max(2, Math.round(estimateLakhs * 0.18)),
  };
}

export function buildDocumentChecklist(profile: KioskProfile): KioskDocument[] {
  return [
    { id: "sop", title: "SOP", subtitle: "Statement of Purpose · 850 words", status: "ready" },
    { id: "lor1", title: "LOR 1", subtitle: "Recommendation · Academic referee", status: "ready" },
    {
      id: "lor2",
      title: "LOR 2",
      subtitle: profile.hasWorkExperience ? "Recommendation · Manager" : "Recommendation · Academic referee",
      status: "ready",
    },
    { id: "resume", title: "Resume", subtitle: "ATS-friendly, 1 page", status: "ready" },
    { id: "financial", title: "Financial letter", subtitle: "For visa & I-20 / CAS", status: "ready" },
    { id: "transcript", title: "Transcript", subtitle: "Upload from your college", status: "action_needed" },
  ];
}

export function buildSopPreview(profile: KioskProfile, recommendation: KioskRecommendation): string {
  const track = profile.academicTrack || recommendation.fieldOfStudy;
  const uniShort = recommendation.university.split(" ").slice(-1)[0] || recommendation.university;
  return `"${track} isn't a field I stumbled into — it's the work I've spent the last few years building toward. A graduate degree at ${uniShort} is how I close the gap between what I've learned and what I want to build next…"`;
}
