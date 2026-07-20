# Passport Pop Kiosk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace launch/portal-first UI with direct colorful kiosk explorer for university browsing, preferences, documents, and honest handoff preview.

**Architecture:** `PassportKioskExplorer` owns anonymous preference, catalog, selection, shortlist, and handoff state. Focused components render preferences, destination tickets, documents, and handoff overlay. Existing kiosk service gets one anonymous catalog entrypoint sharing same ranker; session API remains handoff-only.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Framer Motion, Vitest, Testing Library, existing kiosk service/contracts.

## Global Constraints

- `/` renders direct kiosk explorer; `/kiosk` and `/portal` redirect to `/`.
- No Django/backend API changes.
- Kiosk browsing is anonymous. Phone OTP begins only after `Prepare handoff preview`.
- Catalog source always renders `Live catalog` or `Demo catalog`.
- Never claim file upload, WhatsApp, PDF, CRM, advisor, or counsellor delivery without confirmed live response.
- Palette: ink `#171237`, violet `#634CFF`, lime `#C4FF4D`, sky `#26B4F6`, coral `#FF6D8F`, mango `#FFE19B`, canvas `#F7F6FF`.
- Desktop: 20% preferences, 56% university matches, 24% document requirements. Mobile uses accessible preference/document drawers.
- All controls have labels, visible focus, 48px minimum touch target, and reduced-motion support.

---

### Task 1: Add anonymous catalog entrypoint and requirement context

**Files:**
- Modify: `frontend/lib/kiosk/service.ts`
- Create: `frontend/lib/kiosk/service.test.ts`

**Interfaces:**
- Consumes: `KioskProfile`, existing cached `loadCatalog()`, course ranker.
- Produces: `loadPublicKioskRecommendations(profile: KioskProfile): Promise<KioskRecommendationBundle>` and `getSelectedProgramRequirement(recommendation: KioskRecommendation | null): { label: string; value: string }`.

- [ ] **Step 1: Write failing public-catalog tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { INITIAL_KIOSK_PROFILE } from "./types";
import { getSelectedProgramRequirement, loadPublicKioskRecommendations } from "./service";

describe("public kiosk catalog", () => {
  it("returns ranked catalog without a kiosk session", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("offline"));
    const bundle = await loadPublicKioskRecommendations(INITIAL_KIOSK_PROFILE);
    expect(bundle.source).toBe("demo_catalog");
    expect(bundle.recommendations.length).toBeGreaterThan(0);
  });

  it("uses catalog requirement text without inventing documents", () => {
    expect(getSelectedProgramRequirement({ ielts: "6.5 overall" } as never)).toEqual({
      label: "Minimum English score",
      value: "6.5 overall",
    });
    expect(getSelectedProgramRequirement(null)).toEqual({
      label: "Select a program",
      value: "Requirements shown from catalog when available",
    });
  });
});
```

- [ ] **Step 2: Run focused test; confirm fail**

Run: `npm test -- lib/kiosk/service.test.ts`

Expected: FAIL because exported public functions do not exist.

- [ ] **Step 3: Extract shared bundle builder, then export public entrypoint**

```ts
async function buildRecommendationBundle(profile: KioskProfile): Promise<KioskRecommendationBundle> {
  const catalog = await loadCatalog();
  const mappedProfile = toRecommendationProfile(profile);
  const ranked = buildShortlistCards(catalog.courses, mappedProfile, "");
  const coursesById = new Map(catalog.courses.map((course) => [course.course_id, course]));
  const recommendations = ranked.courses.length > 0
    ? ranked.courses.slice(0, 18).flatMap((card) => {
        const course = coursesById.get(card.id);
        return course ? [buildRecommendationFromCard(card, course, profile)] : [];
      })
    : buildFallbackRecommendations(catalog.courses, profile);

  return {
    source: catalog.source,
    totalPrograms: ranked.totalMatches > 0 ? ranked.totalMatches : recommendations.length,
    profileSignalChips: buildProfileSignalChips(mappedProfile),
    recommendations,
  };
}

export async function loadPublicKioskRecommendations(profile: KioskProfile) {
  return buildRecommendationBundle(profile);
}

export function getSelectedProgramRequirement(recommendation: KioskRecommendation | null) {
  return recommendation
    ? { label: "Minimum English score", value: recommendation.ielts }
    : { label: "Select a program", value: "Requirements shown from catalog when available" };
}
```

Update `loadKioskRecommendations` to assert/save session then return `buildRecommendationBundle(profile)`.

- [ ] **Step 4: Run focused test; confirm pass**

Run: `npm test -- lib/kiosk/service.test.ts`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit service layer**

```bash
git add frontend/lib/kiosk/service.ts frontend/lib/kiosk/service.test.ts
git commit -m "feat: add anonymous kiosk catalog"
```

### Task 2: Build controlled kiosk explorer components

**Files:**
- Create: `frontend/components/kiosk/PassportKioskExplorer.tsx`
- Create: `frontend/components/kiosk/KioskPreferences.tsx`
- Create: `frontend/components/kiosk/UniversityTicket.tsx`
- Create: `frontend/components/kiosk/RequiredDocumentsPanel.tsx`
- Create: `frontend/components/kiosk/HandoffOverlay.tsx`
- Create: `frontend/components/kiosk/PassportKioskExplorer.test.tsx`

**Interfaces:**
- Consumes: `loadPublicKioskRecommendations`, `buildDocumentChecklist`, `getSelectedProgramRequirement`, `startKioskSession`, `verifyKioskOtp`, `completeKioskHandoff`, `KioskProfile`, `KioskRecommendationBundle`.
- Produces: anonymous three-column explorer; `onSelect(id)`, `onToggleShortlist(id)`, and handoff overlay flow.

- [ ] **Step 1: Write failing explorer interaction test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PassportKioskExplorer } from "./PassportKioskExplorer";

vi.mock("@/lib/kiosk/service", () => ({
  loadPublicKioskRecommendations: vi.fn().mockResolvedValue({
    source: "demo_catalog", totalPrograms: 2, profileSignalChips: [], recommendations: [
      { id: 1, title: "MSc AI", university: "University of Toronto", country: "Canada", location: "Toronto", degreeLevel: "Postgraduate", fieldOfStudy: "Computer Science", tuitionLabel: "CAD 30,000", tuitionValue: 30000, duration: "16 months", intakeLabel: "Fall", intakeList: ["Fall"], ielts: "6.5 overall", score: 92, successLabel: "High", reasons: [], logoUrl: null },
    ],
  }),
  buildDocumentChecklist: vi.fn().mockReturnValue([{ id: "transcript", title: "Transcript", subtitle: "Upload from college", status: "action_needed" }]),
  getSelectedProgramRequirement: vi.fn().mockReturnValue({ label: "Minimum English score", value: "6.5 overall" }),
}));

it("opens preferences and updates document context for selected program", async () => {
  const user = userEvent.setup();
  render(<PassportKioskExplorer />);
  await screen.findByText("University of Toronto");
  await user.click(screen.getByRole("button", { name: /open preferences/i }));
  expect(screen.getByRole("region", { name: /preferences/i })).toBeVisible();
  await user.click(screen.getByRole("button", { name: /select msc ai/i }));
  expect(screen.getByText("Minimum English score")).toBeVisible();
  expect(screen.getByText("6.5 overall")).toBeVisible();
  expect(screen.getByText("Demo catalog")).toBeVisible();
});
```

- [ ] **Step 2: Run test; confirm fail**

Run: `npm test -- components/kiosk/PassportKioskExplorer.test.tsx`

Expected: FAIL because explorer component does not exist.

- [ ] **Step 3: Implement preference, ticket, and document boundaries**

```tsx
// KioskPreferences.tsx
type KioskPreferencesProps = {
  profile: KioskProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: <Field extends keyof KioskProfile>(field: Field, value: KioskProfile[Field]) => void;
};

function PreferenceSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return <section><button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{title}</button>{expanded ? children : null}</section>;
}

export function KioskPreferences({ profile, open, onOpenChange, onChange }: KioskPreferencesProps) {
  return <aside aria-label="Preferences" className={open ? "passport-preferences is-open" : "passport-preferences"}>
    <button aria-expanded={open} aria-label="Open preferences" onClick={() => onOpenChange(!open)}>Preferences</button>
    {open && <div role="region" aria-label="Preference controls">
      <PreferenceSection title="Destination"><label>Countries<select aria-label="Preferred countries" value={profile.preferredCountries[0] ?? "Canada"} onChange={(event) => onChange("preferredCountries", [event.target.value])}>{COUNTRY_OPTIONS.map((country) => <option key={country}>{country}</option>)}</select></label></PreferenceSection>
      <PreferenceSection title="Program"><label>Academic track<select aria-label="Academic track" value={profile.academicTrack} onChange={(event) => onChange("academicTrack", event.target.value as KioskProfile["academicTrack"])}>{["", ...FIELD_OPTIONS].map((track) => <option key={track} value={track}>{track || "Choose track"}</option>)}</select></label></PreferenceSection>
      <PreferenceSection title="Budget"><label>Annual budget: ₹{profile.budgetMaxLakhs}L<input aria-label="Annual budget in lakhs" type="range" min="10" max="70" value={profile.budgetMaxLakhs} onChange={(event) => onChange("budgetMaxLakhs", Number(event.target.value))} /></label></PreferenceSection>
      <PreferenceSection title="Intake"><label>Preferred intake<select aria-label="Preferred intake" value={profile.intakeSeason} onChange={(event) => onChange("intakeSeason", event.target.value)}>{INTAKE_OPTIONS.map((intake) => <option key={intake}>{intake}</option>)}</select></label></PreferenceSection>
    </div>}
  </aside>;
}

// UniversityTicket.tsx
type UniversityTicketProps = {
  recommendation: KioskRecommendation;
  selected: boolean;
  shortlisted: boolean;
  onSelect: () => void;
  onToggleShortlist: () => void;
};

function getRouteTone(country: string) {
  if (country === "Australia") return "australia";
  if (country === "United Kingdom") return "united-kingdom";
  return "canada";
}

export function UniversityTicket({ recommendation, selected, shortlisted, onSelect, onToggleShortlist }: UniversityTicketProps) {
  const routeTone = getRouteTone(recommendation.country);
  return <article className={`university-ticket tone-${routeTone}`}>
    <button aria-label={`Select ${recommendation.title}`} onClick={onSelect}>{recommendation.university}</button>
    <span>{recommendation.title}</span><strong>{recommendation.score}% match</strong>
    <button aria-pressed={shortlisted} onClick={onToggleShortlist}>{shortlisted ? "Shortlisted" : "Shortlist"}</button>
  </article>;
}

// RequiredDocumentsPanel.tsx
type RequiredDocumentsPanelProps = {
  profile: KioskProfile;
  recommendation: KioskRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RequiredDocumentsPanel({ profile, recommendation, open, onOpenChange }: RequiredDocumentsPanelProps) {
  const requirement = getSelectedProgramRequirement(recommendation);
  return <aside aria-label="Required documents" className={open ? "passport-documents is-open" : "passport-documents"}>
    <button aria-expanded={open} aria-label="Open required documents" onClick={() => onOpenChange(!open)}>Required documents</button>
    <p>{requirement.label}</p><strong>{requirement.value}</strong>
    {buildDocumentChecklist(profile).map((document) => <div key={document.id}>{document.title}<small>{document.subtitle}</small></div>)}
    <p>Requirements shown for planning. No files uploaded from kiosk.</p>
  </aside>;
}
```

`PassportKioskExplorer` loads catalog in `useEffect`, refreshes when student presses `Update matches`, defaults selection to first result, and passes controlled profile state to children. Use `AbortController`/cancelled flag to prevent state updates after unmount. Use `SourceBadge` with returned source.

- [ ] **Step 4: Implement handoff-only identity overlay**

```tsx
type HandoffOverlayProps = {
  open: boolean;
  profile: KioskProfile;
  shortlist: KioskRecommendation[];
  onClose: () => void;
};

export function HandoffOverlay({ open, profile, shortlist, onClose }: HandoffOverlayProps) {
  const [step, setStep] = useState<"phone" | "otp" | "complete">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState<KioskSessionState | null>(null);

  async function submitPhone() {
    const nextSession = await startKioskSession(phone, getKioskDeviceId());
    setSession(nextSession); setStep("otp");
  }
  async function submitOtp() {
    if (!session) return;
    const verified = await verifyKioskOtp(session.sessionId, otp);
    await completeKioskHandoff(verified.session.sessionId, shortlist.map((item) => item.id), shortlist);
    setStep("complete");
  }
  if (!open) return null;
  return <dialog open aria-label="Prepare handoff preview">
    {step === "phone" && <form onSubmit={(event) => { event.preventDefault(); void submitPhone(); }}><label>WhatsApp number<input aria-label="WhatsApp number" inputMode="numeric" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} /></label><button type="submit">Send verification code</button></form>}
    {step === "otp" && <form onSubmit={(event) => { event.preventDefault(); void submitOtp(); }}><label>Verification code<input aria-label="Verification code" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} /></label><button type="submit">Prepare handoff preview</button></form>}
    {step === "complete" && <section aria-live="polite"><h2>Handoff preview prepared</h2><p>This kiosk demo does not send WhatsApp.</p><button type="button" onClick={onClose}>Back to matches</button></section>}
  </dialog>;
}
```

- [ ] **Step 5: Run explorer test; confirm pass**

Run: `npm test -- components/kiosk/PassportKioskExplorer.test.tsx`

Expected: PASS, 1 test.

- [ ] **Step 6: Commit explorer UI**

```bash
git add frontend/components/kiosk
git commit -m "feat: add passport pop kiosk explorer"
```

### Task 3: Make kiosk direct and retire portal/launch UI

**Files:**
- Modify: `frontend/components/kiosk/KioskExperience.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/kiosk/page.tsx`
- Modify: `frontend/app/portal/page.tsx`
- Delete: `frontend/components/signal/SignalLaunch.tsx`
- Delete: `frontend/components/signal/SignalLaunch.test.tsx`
- Delete: `frontend/components/signal/SignalMark.tsx`
- Delete: `frontend/components/signal/SignalShell.tsx`
- Delete: `frontend/components/signal/PathSignal.tsx`
- Delete: `frontend/components/signal/PathSignal.test.tsx`
- Delete: `frontend/components/signal/PortalExperience.tsx`
- Delete: `frontend/components/signal/PortalExperience.test.tsx`
- Delete: `frontend/components/signal/MatchCard.tsx`
- Delete: `frontend/components/signal/ShortlistPanel.tsx`
- Delete: `frontend/components/signal/DocumentTaskList.tsx`
- Delete: `frontend/lib/signal/portal.ts`
- Delete: `frontend/lib/signal/portal.test.ts`
- Modify: `frontend/components/kiosk/KioskExperience.test.tsx`

**Interfaces:**
- Consumes: `PassportKioskExplorer`.
- Produces: unchanged `KioskExperience` default import contract, route redirects, no public student-portal UI.

- [ ] **Step 1: Rewrite failing route-shell tests**

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import HomePage from "@/app/page";

vi.mock("@/components/kiosk/KioskExperience", () => ({ default: () => <div>Passport kiosk explorer</div> }));

it("renders kiosk directly at home", () => {
  render(<HomePage />);
  expect(screen.getByText("Passport kiosk explorer")).toBeVisible();
});
```

- [ ] **Step 2: Run test; confirm fail**

Run: `npm test -- components/kiosk/KioskExperience.test.tsx`

Expected: FAIL because home renders SignalLaunch.

- [ ] **Step 3: Wire root and redirect aliases**

```tsx
// components/kiosk/KioskExperience.tsx
export { PassportKioskExplorer as default } from "./PassportKioskExplorer";

// app/page.tsx
import KioskExperience from "@/components/kiosk/KioskExperience";
export default function HomePage() { return <KioskExperience />; }

// app/kiosk/page.tsx and app/portal/page.tsx
import { redirect } from "next/navigation";
export default function KioskAliasPage() { redirect("/"); }
```

Delete retired portal/launch/view-model files. Retain `frontend/components/signal/SourceBadge.tsx`; it is used by kiosk explorer.

- [ ] **Step 4: Run route-shell test; confirm pass**

Run: `npm test -- components/kiosk/KioskExperience.test.tsx`

Expected: PASS, 1 test.

- [ ] **Step 5: Commit direct routing**

```bash
git add frontend/app frontend/components frontend/lib
git commit -m "feat: make passport kiosk direct entry"
```

### Task 4: Apply Passport Pop visual system and responsive behavior

**Files:**
- Create: `frontend/app/passport-kiosk.css`
- Modify: `frontend/app/layout.tsx`
- Delete: `frontend/app/signal.css`

**Interfaces:**
- Consumes: classes rendered by `PassportKioskExplorer`, `KioskPreferences`, `UniversityTicket`, `RequiredDocumentsPanel`, `HandoffOverlay`, and `SourceBadge`.
- Produces: desktop columns, mobile drawers, destination-ticket styling, focus/reduced-motion rules.

- [ ] **Step 1: Write failing rendered-state tests**

```tsx
it("uses accessible mobile drawers", async () => {
  const user = userEvent.setup();
  render(<PassportKioskExplorer />);
  await screen.findByText("University of Toronto");
  await user.click(screen.getByRole("button", { name: /open required documents/i }));
  expect(screen.getByRole("region", { name: /required documents/i })).toHaveAttribute("data-open", "true");
});
```

- [ ] **Step 2: Run test; confirm fail**

Run: `npm test -- components/kiosk/PassportKioskExplorer.test.tsx`

Expected: FAIL because drawer region does not expose `data-open` state.

- [ ] **Step 3: Add classes and CSS token layer**

```css
:root { --passport-ink:#171237; --passport-violet:#634CFF; --passport-lime:#C4FF4D; --passport-sky:#26B4F6; --passport-coral:#FF6D8F; --passport-mango:#FFE19B; --passport-canvas:#F7F6FF; }
.passport-kiosk { min-height:100dvh; color:var(--passport-ink); background:var(--passport-canvas); }
.passport-grid { display:grid; grid-template-columns:minmax(220px,.2fr) minmax(0,.56fr) minmax(240px,.24fr); gap:16px; }
.university-ticket { display:grid; grid-template-columns:8px 1fr auto; border-radius:16px; background:#fff; }
.university-ticket::before { content:""; grid-row:1/-1; background:var(--ticket-tone); border-radius:16px 0 0 16px; }
.tone-canada { --ticket-tone:var(--passport-violet); }.tone-australia { --ticket-tone:var(--passport-sky); }.tone-united-kingdom { --ticket-tone:var(--passport-coral); }
@media (max-width:760px) { .passport-grid { display:block; } .passport-preferences,.passport-documents { position:fixed; inset:auto 12px 12px; transform:translateY(calc(100% + 24px)); } .passport-preferences.is-open,.passport-documents.is-open { transform:translateY(0); } }
@media (prefers-reduced-motion:reduce) { .passport-kiosk *, .passport-kiosk *::before, .passport-kiosk *::after { transition:none!important; animation:none!important; } }
```

Import `./passport-kiosk.css` in `layout.tsx`; remove `./signal.css`. Make every interactive control `min-height:48px`; define `:focus-visible` using violet outline and lime outline offset.

- [ ] **Step 4: Run mobile drawer test; confirm pass**

Run: `npm test -- components/kiosk/PassportKioskExplorer.test.tsx`

Expected: PASS, all explorer tests.

- [ ] **Step 5: Commit visual system**

```bash
git add frontend/app/passport-kiosk.css frontend/app/layout.tsx frontend/app/signal.css frontend/components/kiosk
git commit -m "style: apply passport pop kiosk system"
```

### Task 5: Full verification and route smoke

**Files:**
- Modify: none unless checks expose defect.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: PASS. No portal/launch test remains; service and direct explorer tests pass.

- [ ] **Step 2: Run static checks**

Run: `npm run lint && npm run build`

Expected: exit 0. Build lists `/`, `/kiosk`, and `/portal`; alias routes use redirect behavior.

- [ ] **Step 3: Inspect scope**

Run:

```bash
git diff main...HEAD --check
git diff --stat main...HEAD
git status --short
```

Expected: no whitespace errors; changes limited to kiosk frontend, test tooling, and approved docs.

- [ ] **Step 4: Run live route smoke**

Run:

```bash
for task_route in / /kiosk /portal; do
  curl -sS -L --max-time 15 -o /dev/null -w "%{http_code} ${task_route}\n" "http://127.0.0.1:3002${task_route}"
done
```

Expected: `200` for all three routes after redirects.

- [ ] **Step 5: Commit verification-only fixes if needed**

```bash
git status --short
```

Expected: clean working tree when no verification fix is required. If a check needs a code fix, add only its changed frontend file(s), commit with `fix: complete passport kiosk verification`, then re-run Steps 1–4.
