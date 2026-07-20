import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/components/kiosk/KioskExperience", () => ({
  default: () => <div>Passport kiosk explorer</div>,
}));

import HomePage from "@/app/page";

it("renders kiosk directly at home", () => {
  render(<HomePage />);

  expect(screen.getByText("Passport kiosk explorer")).toBeVisible();
});
