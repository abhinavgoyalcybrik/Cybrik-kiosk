export type KioskScreen =
  | "attract"
  | "phone"
  | "otp"
  | "profile"
  | "matching"
  | "results"
  | "handoff";

export type KioskSortMode = "best_match" | "lowest_cost" | "fastest_intake";

export type KioskProfile = {
  fullName: string;
  email: string;
  phone: string;
  studyGoal: "" | "undergraduate" | "postgraduate";
  academicTrack:
    | ""
    | "Engineering"
    | "Computer Science"
    | "Data Science"
    | "Business"
    | "Commerce"
    | "Cyber Security"
    | "Health Sciences"
    | "Arts & Humanities";
  preferredCountries: string[];
  preferredFields: string[];
  intakeSeason: string;
  intakeYear: string;
  scoreMode: "percentage" | "cgpa";
  academicScore: string;
  englishExam: "" | "IELTS" | "PTE" | "TOEFL" | "Duolingo" | "None yet";
  englishScore: string;
  budgetMaxLakhs: number;
  hasWorkExperience: boolean;
  workExperienceYears: string;
};

export type KioskSessionState = {
  sessionId: string;
  deviceId: string;
  phone: string;
  maskedPhone: string;
  resendAvailableAt: number;
  expiresAt: number;
  demoCode?: string;
  verified: boolean;
  source: "demo";
};

export type KioskSessionStartResponse = KioskSessionState;

export type KioskOtpVerifyResponse = {
  session: KioskSessionState;
  profilePrefill?: Partial<KioskProfile>;
};

export type KioskRecommendation = {
  id: number;
  title: string;
  university: string;
  logoUrl: string | null;
  location: string;
  country: string;
  degreeLevel: string;
  fieldOfStudy: string;
  tuitionLabel: string;
  tuitionValue: number | null;
  duration: string;
  intakeLabel: string;
  intakeList: string[];
  ielts: string;
  score: number;
  successLabel: "High" | "Medium" | "Growing";
  reasons: string[];
};

export type KioskRecommendationBundle = {
  source: "live_catalog" | "demo_catalog";
  totalPrograms: number;
  profileSignalChips: string[];
  recommendations: KioskRecommendation[];
};

export type KioskHandoffReceipt = {
  channel: "WhatsApp";
  crmStatus: "queued" | "sent";
  leadReference: string;
  deliveredPrograms: number;
  deliveredDocuments: string[];
  etaMinutes: number;
  sentTo: string;
};

export const COUNTRY_OPTIONS = [
  "Canada",
  "Australia",
  "United Kingdom",
  "United States",
  "Ireland",
  "Germany",
] as const;

export const FIELD_OPTIONS = [
  "Computer Science",
  "Data Science",
  "Engineering",
  "Business",
  "Commerce",
  "Cyber Security",
  "Health Sciences",
  "Arts & Humanities",
] as const;

export const INTAKE_OPTIONS = [
  "Fall (Aug - Oct)",
  "Spring (Feb - Apr)",
  "Summer (May - Jul)",
  "Winter (Nov - Jan)",
] as const;

export const STUDY_GOAL_OPTIONS = [
  { label: "Undergraduate", value: "undergraduate" },
  { label: "Postgraduate", value: "postgraduate" },
] as const;

export const ENGLISH_EXAM_OPTIONS = [
  "IELTS",
  "PTE",
  "TOEFL",
  "Duolingo",
  "None yet",
] as const;

export const WORK_EXPERIENCE_OPTIONS = ["0", "1", "2", "3", "4+"] as const;

export const INTAKE_YEAR_OPTIONS = ["2026", "2027", "2028"] as const;

export const INITIAL_KIOSK_PROFILE: KioskProfile = {
  fullName: "",
  email: "",
  phone: "",
  studyGoal: "",
  academicTrack: "",
  preferredCountries: ["Canada", "Australia"],
  preferredFields: ["Computer Science"],
  intakeSeason: "Fall (Aug - Oct)",
  intakeYear: "2027",
  scoreMode: "percentage",
  academicScore: "",
  englishExam: "IELTS",
  englishScore: "",
  budgetMaxLakhs: 32,
  hasWorkExperience: false,
  workExperienceYears: "0",
};
