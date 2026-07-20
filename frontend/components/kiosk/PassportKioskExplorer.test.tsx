import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/kiosk/service", () => ({
  buildDocumentChecklist: vi.fn().mockReturnValue([
    {
      id: "transcript",
      title: "Transcript",
      subtitle: "Upload from college",
      status: "action_needed",
    },
  ]),
  completeKioskHandoff: vi.fn(),
  getKioskDeviceId: vi.fn().mockReturnValue("kiosk-test"),
  getSelectedProgramRequirement: vi.fn().mockReturnValue({
    label: "Minimum English score",
    value: "6.5 overall",
  }),
  loadPublicKioskRecommendations: vi.fn().mockResolvedValue({
    source: "demo_catalog",
    totalPrograms: 2,
    profileSignalChips: [],
    recommendations: [
      {
        id: 1,
        title: "MSc AI",
        university: "University of Toronto",
        country: "Canada",
        location: "Toronto",
        degreeLevel: "Postgraduate",
        fieldOfStudy: "Computer Science",
        tuitionLabel: "CAD 30,000",
        tuitionValue: 30000,
        duration: "16 months",
        intakeLabel: "Fall",
        intakeList: ["Fall"],
        ielts: "6.5 overall",
        score: 92,
        successLabel: "High",
        reasons: [],
        logoUrl: null,
      },
    ],
  }),
  startKioskSession: vi.fn(),
  verifyKioskOtp: vi.fn(),
}));

import { PassportKioskExplorer } from "./PassportKioskExplorer";

it("opens preferences and updates document context for selected program", async () => {
  const user = userEvent.setup();
  render(<PassportKioskExplorer />);

  await screen.findByText("University of Toronto");
  expect(screen.getByText("Demo catalog")).toBeVisible();

  const preferences = screen.getByRole("region", { name: "Preferences" });
  expect(preferences).toHaveAttribute("data-open", "true");
  await user.click(screen.getByRole("button", { name: /close preferences/i }));
  expect(preferences).toHaveAttribute("data-open", "false");
  await user.click(screen.getByRole("button", { name: /open preferences/i }));
  expect(preferences).toHaveAttribute("data-open", "true");

  const documents = screen.getByRole("region", { name: "Required documents" });
  expect(documents).toHaveAttribute("data-open", "true");
  await user.click(screen.getByRole("button", { name: /close required documents/i }));
  expect(documents).toHaveAttribute("data-open", "false");
  await user.click(screen.getByRole("button", { name: /open required documents/i }));
  expect(documents).toHaveAttribute("data-open", "true");

  await user.click(screen.getByRole("button", { name: /select msc ai/i }));
  expect(screen.getByText("Minimum English score")).toBeVisible();
  expect(screen.getByText("6.5 overall")).toBeVisible();
});
