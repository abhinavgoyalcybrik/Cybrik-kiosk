import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  fetchCoursesCatalog: vi.fn().mockRejectedValue(new Error("offline")),
}));

import {
  getSelectedProgramRequirement,
  loadPublicKioskRecommendations,
} from "./service";
import { INITIAL_KIOSK_PROFILE } from "./types";

describe("public kiosk catalog", () => {
  it("returns ranked catalog without a kiosk session", async () => {
    const bundle = await loadPublicKioskRecommendations(INITIAL_KIOSK_PROFILE);

    expect(bundle.source).toBe("demo_catalog");
    expect(bundle.recommendations.length).toBeGreaterThan(0);
  });

  it("uses catalog requirement text without inventing documents", () => {
    expect(
      getSelectedProgramRequirement({ ielts: "6.5 overall" } as never)
    ).toEqual({
      label: "Minimum English score",
      value: "6.5 overall",
    });
    expect(getSelectedProgramRequirement(null)).toEqual({
      label: "Select a program",
      value: "Requirements shown from catalog when available",
    });
  });

  it("returns only submitted New Zealand matches and never falls back to unrelated countries", async () => {
    const bundle = await loadPublicKioskRecommendations({
      ...INITIAL_KIOSK_PROFILE,
      studyGoal: "undergraduate",
      preferredCountries: ["New Zealand"],
      preferredFields: ["Commerce"],
      intakeSeason: "Summer (May - Jul)",
      feeCurrency: "NZD",
    });

    expect(bundle.recommendations.length).toBeGreaterThan(0);
    expect(bundle.recommendations.every((course) => course.country === "New Zealand")).toBe(true);
  });

  it("does not let English scores change the preference percentage", async () => {
    const profile = {
      ...INITIAL_KIOSK_PROFILE,
      studyGoal: "undergraduate" as const,
      preferredCountries: ["New Zealand"],
      preferredFields: ["Commerce"],
      intakeSeason: "Summer (May - Jul)",
    };
    const low = await loadPublicKioskRecommendations({ ...profile, englishScore: "4.0" });
    const high = await loadPublicKioskRecommendations({ ...profile, englishScore: "9.0" });
    expect(low.recommendations[0]?.score).toBe(high.recommendations[0]?.score);
  });
});
