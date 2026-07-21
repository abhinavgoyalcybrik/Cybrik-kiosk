import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import HomePage from "@/app/page";

it("renders the Cybrik Solutions landing experience at home", () => {
  render(<HomePage />);

  expect(screen.getByRole("heading", { name: /your future has a world of possibilities/i })).toBeVisible();
  expect(screen.getByRole("link", { name: /discover my matches/i })).toHaveAttribute("href", "/portal");
});
