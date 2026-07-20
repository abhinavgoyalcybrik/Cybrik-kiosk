import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PortalExperience } from "./PortalExperience";

it("saves a match and uses preview wording for demo handoff", () => {
  render(<PortalExperience />);

  fireEvent.click(screen.getByRole("button", { name: "Matches" }));
  fireEvent.click(
    screen.getByRole("button", {
      name: "Shortlist Master of Computer Science",
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));

  expect(screen.getByText("1 saved program")).toBeInTheDocument();
  expect(screen.getByText("Handoff preview prepared")).toBeInTheDocument();
});
