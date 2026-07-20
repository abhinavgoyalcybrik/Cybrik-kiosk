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
});
