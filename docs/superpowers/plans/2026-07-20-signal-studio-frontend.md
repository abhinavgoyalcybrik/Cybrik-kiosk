# Signal Studio Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Signal Studio public launch, touch kiosk route, and responsive student portal without changing backend contracts.

**Architecture:** Route pages own surface composition. `components/signal` owns reusable visual primitives and portal content. Existing kiosk session and catalog service remains source of local-demo behavior; its status is exposed truthfully in UI.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Tailwind CSS 4 global import, Framer Motion, Vitest, Testing Library.

## Global Constraints

- Preserve existing backend API paths and Django code unchanged.
- Kiosk demo state must be labelled `Demo catalog` when live catalog load fails.
- Handoff preview must not claim WhatsApp, PDF, CRM, or counsellor delivery without confirmed live API response.
- Public, kiosk, and portal use Signal navy `#171237`, ultraviolet `#634CFF`, electric lime `#C4FF4D`, ice `#EEF3FF`, and ink `#1C2141`.
- Every new input has a programmatic label; icon-only controls have `aria-label`; focus is visible; nonessential animation honors `prefers-reduced-motion`.
- Kiosk touch controls have 48px minimum target size. Portal mobile navigation becomes a bottom dock below 760px.

---

### Task 1: Add frontend test foundation and portal view model

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/test/setup.ts`
- Create: `frontend/lib/signal/portal.ts`
- Test: `frontend/lib/signal/portal.test.ts`

**Interfaces:**
- Consumes: `KioskProfile`, `KioskRecommendation` from `frontend/lib/kiosk/types.ts`
- Produces: `getProfileReadiness(profile): ProfileReadiness`, `getHandoffCopy(source): string`, `getPortalSections(): readonly PortalSection[]`, `PORTAL_DEMO_RECOMMENDATIONS: KioskRecommendation[]`

- [ ] **Step 1: Add test packages and scripts**

Run:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest"
```

- [ ] **Step 2: Write failing portal view-model tests**

```ts
import { describe, expect, it } from "vitest";
import { INITIAL_KIOSK_PROFILE } from "@/lib/kiosk/types";
import { getHandoffCopy, getProfileReadiness, getPortalSections } from "./portal";

describe("portal view model", () => {
  it("lists missing profile fields and caps readiness at 100", () => {
    expect(getProfileReadiness(INITIAL_KIOSK_PROFILE)).toEqual({
      percent: 0,
      missing: ["Name", "Study goal", "Academic track", "Academic score", "English score"],
    });
  });

  it("uses preview wording for demo handoff", () => {
    expect(getHandoffCopy("demo_catalog")).toBe("Handoff preview prepared");
  });

  it("exposes five portal sections in student order", () => {
    expect(getPortalSections().map((section) => section.id)).toEqual([
      "overview", "matches", "shortlist", "documents", "profile",
    ]);
  });
});
```

- [ ] **Step 3: Verify test fails before implementation**

Run: `npm test -- lib/signal/portal.test.ts`

Expected: FAIL because `./portal` does not exist.

- [ ] **Step 4: Implement view-model functions and Vitest config**

```ts
export type PortalSectionId = "overview" | "matches" | "shortlist" | "documents" | "profile";
export type ProfileReadiness = { percent: number; missing: string[] };
export type PortalSection = { id: PortalSectionId; label: string };

const readinessFields = [
  ["fullName", "Name"],
  ["studyGoal", "Study goal"],
  ["academicTrack", "Academic track"],
  ["academicScore", "Academic score"],
  ["englishScore", "English score"],
] as const;

export function getProfileReadiness(profile: KioskProfile): ProfileReadiness {
  const missing = readinessFields
    .filter(([field]) => !profile[field].trim())
    .map(([, label]) => label);
  return { percent: Math.round(((readinessFields.length - missing.length) / readinessFields.length) * 100), missing };
}

export function getHandoffCopy(source: "live_catalog" | "demo_catalog") {
  return source === "live_catalog" ? "Prepare advisor handoff" : "Handoff preview prepared";
}

export function getPortalSections() {
  return [
    { id: "overview", label: "Overview" }, { id: "matches", label: "Matches" },
    { id: "shortlist", label: "Shortlist" }, { id: "documents", label: "Documents" },
    { id: "profile", label: "Profile" },
  ] as const;
}
```

Import `KioskProfile` from `@/lib/kiosk/types`. Configure `@` alias to `frontend` in Vitest.

- [ ] **Step 5: Verify test passes**

Run: `npm test -- lib/signal/portal.test.ts`

Expected: PASS, 3 tests.

### Task 2: Create shared Signal Studio primitives

**Files:**
- Create: `frontend/components/signal/SignalMark.tsx`
- Create: `frontend/components/signal/PathSignal.tsx`
- Create: `frontend/components/signal/SourceBadge.tsx`
- Create: `frontend/components/signal/SignalShell.tsx`
- Test: `frontend/components/signal/PathSignal.test.tsx`
- Modify: `frontend/app/globals.css`

**Interfaces:**
- Consumes: `percent: number`, `label: string`, and `source: "live_catalog" | "demo_catalog"`
- Produces: shared branded markup for public, kiosk, and portal routes

- [ ] **Step 1: Write failing path-signal test**

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PathSignal } from "./PathSignal";

it("announces profile readiness with a readable percentage", () => {
  render(<PathSignal percent={82} label="Profile readiness" />);
  expect(screen.getByLabelText("Profile readiness: 82% complete")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify test fails before implementation**

Run: `npm test -- components/signal/PathSignal.test.tsx`

Expected: FAIL because `./PathSignal` does not exist.

- [ ] **Step 3: Implement primitives and token layer**

```tsx
export function PathSignal({ percent, label }: { percent: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div aria-label={`${label}: ${clamped}% complete`} className="signal-path" role="img">
      <span className="signal-path-track" aria-hidden="true">
        <span className="signal-path-fill" style={{ width: `${clamped}%` }} />
      </span>
      <span className="signal-path-value">{clamped}%</span>
    </div>
  );
}
```

Define Signal Studio CSS custom properties, shared card, focus, button, motion-reduction, and responsive utility rules. `SourceBadge` renders `Live catalog` or `Demo catalog` visibly.

- [ ] **Step 4: Verify test passes**

Run: `npm test -- components/signal/PathSignal.test.tsx`

Expected: PASS, 1 test.

### Task 3: Build public launch and route structure

**Files:**
- Modify: `frontend/app/page.tsx`
- Create: `frontend/app/kiosk/page.tsx`
- Create: `frontend/app/portal/page.tsx`
- Create: `frontend/components/signal/SignalLaunch.tsx`
- Test: `frontend/components/signal/SignalLaunch.test.tsx`

**Interfaces:**
- Consumes: `SignalShell`, `SignalMark`, `PathSignal`
- Produces: working links to `/kiosk` and `/portal`

- [ ] **Step 1: Write failing launch navigation test**

```tsx
render(<SignalLaunch />);
expect(screen.getByRole("link", { name: /start kiosk match/i })).toHaveAttribute("href", "/kiosk");
expect(screen.getByRole("link", { name: /open student portal/i })).toHaveAttribute("href", "/portal");
```

- [ ] **Step 2: Verify test fails before implementation**

Run: `npm test -- components/signal/SignalLaunch.test.tsx`

Expected: FAIL because `./SignalLaunch` does not exist.

- [ ] **Step 3: Implement launch and routes**

```tsx
// app/page.tsx
import { SignalLaunch } from "@/components/signal/SignalLaunch";
export default function HomePage() { return <SignalLaunch />; }

// app/kiosk/page.tsx
import KioskExperience from "@/components/kiosk/KioskExperience";
export default function KioskPage() { return <main className="kiosk-page"><KioskExperience /></main>; }

// app/portal/page.tsx
import { PortalExperience } from "@/components/signal/PortalExperience";
export default function PortalPage() { return <PortalExperience />; }
```

`SignalLaunch` uses `next/link` for `/kiosk` and `/portal`, match-oriented copy, country chips, two entry actions, and one `PathSignal` hero.

- [ ] **Step 4: Verify test passes**

Run: `npm test -- components/signal/SignalLaunch.test.tsx`

Expected: PASS, 1 test.

### Task 4: Build responsive student portal

**Files:**
- Create: `frontend/components/signal/PortalExperience.tsx`
- Create: `frontend/components/signal/MatchCard.tsx`
- Create: `frontend/components/signal/DocumentTaskList.tsx`
- Create: `frontend/components/signal/ShortlistPanel.tsx`
- Test: `frontend/components/signal/PortalExperience.test.tsx`

**Interfaces:**
- Consumes: `getProfileReadiness`, `getHandoffCopy`, `getPortalSections`, Kiosk profile/recommendation contracts, and existing local catalog service
- Produces: portal navigation, shortlist state, detail state, source badge, and handoff preview

- [ ] **Step 1: Write failing portal interaction tests**

```tsx
render(<PortalExperience />);
await user.click(screen.getByRole("button", { name: /matches/i }));
await user.click(screen.getByRole("button", { name: /shortlist master of/i }));
await user.click(screen.getByRole("button", { name: /shortlist/i }));
expect(screen.getByText(/1 saved program/i)).toBeInTheDocument();
expect(screen.getByText("Handoff preview prepared")).toBeInTheDocument();
```

- [ ] **Step 2: Verify test fails before implementation**

Run: `npm test -- components/signal/PortalExperience.test.tsx`

Expected: FAIL because `./PortalExperience` does not exist.

- [ ] **Step 3: Implement portal sections**

```tsx
const [section, setSection] = useState<PortalSectionId>("overview");
const [profile, setProfile] = useState(INITIAL_KIOSK_PROFILE);
const [shortlistIds, setShortlistIds] = useState<number[]>([]);
const source = "demo_catalog" as const;
const handoffCopy = getHandoffCopy(source);
```

Render controlled Overview, Matches, Shortlist, Documents, and Profile sections. Seed match cards from a local `PORTAL_DEMO_RECOMMENDATIONS` export in `lib/signal/portal.ts`. `MatchCard` exposes a shortlist button named `Shortlist ${recommendation.title}`. Documents use `Preview`, never upload/open/generation copy.

- [ ] **Step 4: Verify test passes**

Run: `npm test -- components/signal/PortalExperience.test.tsx`

Expected: PASS, shortlist and preview copy assertions.

### Task 5: Upgrade kiosk truthfulness, accessibility, and mobile behavior

**Files:**
- Modify: `frontend/components/kiosk/KioskExperience.tsx`
- Modify: `frontend/app/globals.css`
- Test: `frontend/components/kiosk/KioskExperience.test.tsx`

**Interfaces:**
- Consumes: existing kiosk screen state and catalog source
- Produces: exported `ResultsScreen` with `source: "live_catalog" | "demo_catalog"`, honest handoff copy, labelled profile controls, and responsive kiosk layout

- [ ] **Step 1: Write failing kiosk source-state test**

```tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { INITIAL_KIOSK_PROFILE } from "@/lib/kiosk/types";
import { ResultsScreen } from "./KioskExperience";

it("labels recommendation results as demo when bundle source is demo", () => {
  render(<ResultsScreen
    source="demo_catalog"
    profile={INITIAL_KIOSK_PROFILE}
    profileCompletion={0}
    totalPrograms={0}
    filteredRecommendations={[]}
    selectedRecommendation={null}
    shortlistIds={[]}
    countryFilter="All"
    countryCounts={[]}
    sortMode="best_match"
    handoffBusy={false}
    onChangeCountryFilter={vi.fn()}
    onChangeSortMode={vi.fn()}
    onPickRecommendation={vi.fn()}
    onToggleShortlist={vi.fn()}
    onSendKit={vi.fn()}
    onOpenDetail={vi.fn()}
    onOpenDocuments={vi.fn()}
  />);
  expect(screen.getByText("Demo catalog")).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify test fails before implementation**

Run: `npm test -- components/kiosk/KioskExperience.test.tsx`

Expected: FAIL because `ResultsScreen` does not accept a source prop.

- [ ] **Step 3: Implement visible source and honest UI**

Pass `bundle.source` to `ResultsScreen` and render `SourceBadge`. Change mock completion receipt and handoff success wording to preview language. Add `aria-label` or `<label>` to profile inputs/selects. Make small-screen kiosk layout single-column and use `clamp()` typography.

- [ ] **Step 4: Verify test passes**

Run: `npm test -- components/kiosk/KioskExperience.test.tsx`

Expected: PASS, demo-source badge assertion.

### Task 6: Verify full frontend

**Files:**
- Modify: none unless verification exposes defect

- [ ] **Step 1: Run focused test suite**

Run: `npm test`

Expected: PASS, all Signal Studio and kiosk tests.

- [ ] **Step 2: Run static checks**

Run: `npm run lint && npm run build`

Expected: both exit 0 with `/`, `/kiosk`, and `/portal` listed as static routes.

- [ ] **Step 3: Inspect changed scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only planned frontend files plus plan/spec docs and pre-existing user changes.
