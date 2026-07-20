import { describe, expect, it } from "vitest";
import { INITIAL_KIOSK_PROFILE } from "@/lib/kiosk/types";
import {
  getHandoffCopy,
  getPortalSections,
  getProfileReadiness,
} from "./portal";

describe("portal view model", () => {
  it("lists missing profile fields and caps readiness at 100", () => {
    expect(getProfileReadiness(INITIAL_KIOSK_PROFILE)).toEqual({
      percent: 0,
      missing: [
        "Name",
        "Study goal",
        "Academic track",
        "Academic score",
        "English score",
      ],
    });
  });

  it("uses preview wording for demo handoff", () => {
    expect(getHandoffCopy("demo_catalog")).toBe("Handoff preview prepared");
  });

  it("exposes five portal sections in student order", () => {
    expect(getPortalSections().map((section) => section.id)).toEqual([
      "overview",
      "matches",
      "shortlist",
      "documents",
      "profile",
    ]);
  });
});
