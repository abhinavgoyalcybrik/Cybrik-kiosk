import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SignalLaunch } from "./SignalLaunch";

it("links students to kiosk and portal routes", () => {
  render(<SignalLaunch />);

  expect(
    screen.getByRole("link", { name: /start kiosk match/i })
  ).toHaveAttribute("href", "/kiosk");
  expect(
    screen.getByRole("link", { name: /open student portal/i })
  ).toHaveAttribute("href", "/portal");
});
