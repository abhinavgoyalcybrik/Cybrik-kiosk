import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { INITIAL_KIOSK_PROFILE } from "@/lib/kiosk/types";
import { ResultsScreen } from "./KioskExperience";

it("labels recommendation results as demo when bundle source is demo", () => {
  render(
    <ResultsScreen
      countryCounts={[]}
      countryFilter="All"
      filteredRecommendations={[]}
      handoffBusy={false}
      onChangeCountryFilter={vi.fn()}
      onChangeSortMode={vi.fn()}
      onOpenDetail={vi.fn()}
      onOpenDocuments={vi.fn()}
      onPickRecommendation={vi.fn()}
      onSendKit={vi.fn()}
      onToggleShortlist={vi.fn()}
      profile={INITIAL_KIOSK_PROFILE}
      profileCompletion={0}
      selectedRecommendation={null}
      shortlistIds={[]}
      sortMode="best_match"
      source="demo_catalog"
      totalPrograms={0}
    />
  );

  expect(screen.getByText("Demo catalog")).toBeInTheDocument();
});
