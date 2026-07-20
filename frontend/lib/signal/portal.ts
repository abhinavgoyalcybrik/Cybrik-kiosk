import type { KioskProfile, KioskRecommendation } from "@/lib/kiosk/types";

export type PortalSectionId =
  | "overview"
  | "matches"
  | "shortlist"
  | "documents"
  | "profile";

export type PortalSection = {
  id: PortalSectionId;
  label: string;
  kicker: string;
};

export type ProfileReadiness = {
  percent: number;
  missing: string[];
};

const readinessFields = [
  ["fullName", "Name"],
  ["studyGoal", "Study goal"],
  ["academicTrack", "Academic track"],
  ["academicScore", "Academic score"],
  ["englishScore", "English score"],
] as const satisfies ReadonlyArray<readonly [keyof KioskProfile, string]>;

export function getProfileReadiness(profile: KioskProfile): ProfileReadiness {
  const missing = readinessFields
    .filter(([field]) => !profile[field].trim())
    .map(([, label]) => label);

  return {
    percent: Math.round(
      ((readinessFields.length - missing.length) / readinessFields.length) * 100
    ),
    missing,
  };
}

export function getHandoffCopy(source: "live_catalog" | "demo_catalog"): string {
  return source === "live_catalog"
    ? "Prepare advisor handoff"
    : "Handoff preview prepared";
}

export function getPortalSections(): readonly PortalSection[] {
  return [
    { id: "overview", label: "Overview", kicker: "Your path" },
    { id: "matches", label: "Matches", kicker: "Ranked routes" },
    { id: "shortlist", label: "Shortlist", kicker: "Saved choices" },
    { id: "documents", label: "Documents", kicker: "Application kit" },
    { id: "profile", label: "Profile", kicker: "Match signal" },
  ];
}

export const PORTAL_DEMO_RECOMMENDATIONS: KioskRecommendation[] = [
  {
    id: 9101,
    title: "Master of Computer Science",
    university: "University of Toronto",
    logoUrl: null,
    location: "Toronto, Ontario",
    country: "Canada",
    degreeLevel: "Master's",
    fieldOfStudy: "Computer Science",
    tuitionLabel: "CAD 34,180 / year",
    tuitionValue: 34180,
    duration: "20 months",
    intakeLabel: "Fall 2027",
    intakeList: ["Fall 2027"],
    ielts: "7.0 overall",
    score: 92,
    successLabel: "High",
    reasons: [
      "Strong computer science alignment",
      "IELTS profile clears requirement",
      "Canada matches your stated preference",
    ],
  },
  {
    id: 9102,
    title: "Master of Data Science",
    university: "University of Melbourne",
    logoUrl: null,
    location: "Melbourne, Victoria",
    country: "Australia",
    degreeLevel: "Master's",
    fieldOfStudy: "Data Science",
    tuitionLabel: "AUD 39,840 / year",
    tuitionValue: 39840,
    duration: "24 months",
    intakeLabel: "February 2027",
    intakeList: ["February 2027", "July 2027"],
    ielts: "6.5 overall",
    score: 88,
    successLabel: "High",
    reasons: [
      "Data-focused career route",
      "Two flexible intakes",
      "Strong scholarship discovery signal",
    ],
  },
  {
    id: 9103,
    title: "MSc Artificial Intelligence",
    university: "University of Edinburgh",
    logoUrl: null,
    location: "Edinburgh, Scotland",
    country: "United Kingdom",
    degreeLevel: "Master's",
    fieldOfStudy: "Artificial Intelligence",
    tuitionLabel: "GBP 31,600 / year",
    tuitionValue: 31600,
    duration: "12 months",
    intakeLabel: "September 2027",
    intakeList: ["September 2027"],
    ielts: "7.0 overall",
    score: 84,
    successLabel: "High",
    reasons: [
      "Fast one-year completion",
      "AI specialization fit",
      "High research relevance",
    ],
  },
];
