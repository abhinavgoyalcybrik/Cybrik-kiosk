import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PathSignal } from "./PathSignal";

it("announces profile readiness with a readable percentage", () => {
  render(<PathSignal percent={82} label="Profile readiness" />);

  expect(
    screen.getByLabelText("Profile readiness: 82% complete")
  ).toBeInTheDocument();
});
