# Signal Studio Frontend Design

## Goal

Create an advanced, rateable Cybrik EduGraph frontend for two audiences: a touch-first walk-in kiosk and a responsive student portal. Both surfaces must communicate profile-driven international-course matching through one Signal Studio visual system.

## Product Surfaces

### Public launch: `/`

- Explain profile-based matching in one screen.
- Show country signals and a compact example match.
- Give two clear entry actions: `Start kiosk match` and `Open student portal`.
- Stay useful without backend data by rendering labelled demo data.

### Kiosk: `/kiosk`

- Preserve current sequence: attract, phone, OTP, profile, matching, results, detail/documents, handoff.
- Use large touch targets, sparse screens, visible progress, and strong next action.
- Retain local demo session behavior only for this rating pass.
- When backend catalog is unavailable, show `Demo catalog` instead of hiding fallback state.
- Replace false delivery wording with `Handoff preview prepared` unless a live backend request confirms delivery.

### Student portal: `/portal`

- Responsive dashboard with Overview, Matches, Shortlist, Documents, and Profile sections.
- Overview contains profile readiness, next task, current intake, shortlist count, and a recommended match.
- Matches supports ranked cards, filters, selection, detail context, and shortlist toggling.
- Shortlist shows saved programs and advisor handoff preview.
- Documents shows evidence-backed task states. Rating pass uses preview-only document actions.
- Profile reuses the same profile fields and updates readiness immediately.

## Visual Direction

Selected direction: **Signal Studio**.

- Signal navy: `#171237`
- Ultraviolet: `#634CFF`
- Electric lime: `#C4FF4D`
- Ice: `#EEF3FF`
- Ink: `#1C2141`
- Typography: Plus Jakarta Sans for display and body; JetBrains Mono for metadata, scores, and system states.
- Signature element: a **path signal** route. It visualizes profile completeness, country alignment, and match confidence. It appears in public launch, kiosk progress, portal readiness, and match emphasis.
- Motion: a single staged reveal when a screen changes; hover and tap feedback only where it confirms action. All nonessential motion respects `prefers-reduced-motion`.

## Architecture

```text
app/page.tsx                 public Signal Studio launch
app/kiosk/page.tsx           touch kiosk route
app/portal/page.tsx          responsive portal route
components/signal/           shell, path signal, shared match and profile UI
components/kiosk/            kiosk-specific screen composition
lib/kiosk/                   existing profile, recommendation, and demo-session contract
```

- Split route-level layout from screen-specific behavior. `KioskExperience.tsx` must no longer own portal responsibilities.
- Reuse `KioskProfile`, `KioskRecommendation`, `buildCostBreakdown`, and local recommendation loading for both kiosk and portal.
- Keep server/API contract unchanged. No backend endpoint, database, OTP, or WhatsApp delivery change belongs in this rating pass.
- Add an explicit client-side source state: `live_catalog` or `demo_catalog`.

## Components

- `SignalShell`: shared top navigation, backdrop, route context, and mobile navigation.
- `PathSignal`: accessible profile-progress visual with text alternative.
- `ProfileReadiness`: current completion percentage, missing-field callout, and edit entry point.
- `MatchCard`: score, location, cost, intake, reason chips, shortlist action, and detail action.
- `MatchDetail`: selected program context plus cost breakdown and document entry.
- `ShortlistPanel`: saved-program list and handoff preview.
- `DocumentTaskList`: document states and non-deceptive preview actions.
- `PortalDashboard`: owns portal section selection and shared profile/recommendation state.

## State and Error Handling

- Profile and shortlist stay in client state for rating pass.
- First catalog request uses existing `/api/courses/` path. A failure creates a labelled demo catalog state.
- Kiosk handoff remains preview-only. Copy must not claim CRM save, counsellor notification, PDF delivery, or WhatsApp delivery without live confirmation.
- Empty match state gives a profile-edit action and a clear reason.
- Disabled controls include visible reason text.

## Accessibility and Responsiveness

- Every input has a programmatic label. Icon-only controls have `aria-label`.
- Portal supports keyboard navigation, visible focus, and semantic headings.
- Kiosk uses touch targets at least 48 CSS pixels.
- Portal collapses navigation into a bottom mobile dock below 760px.
- Kiosk layouts become single-column below 1024px; no fixed 78px headings or forced row layouts on mobile.

## Test Strategy

- Add a frontend test runner and route/component tests before production implementation.
- Test profile readiness derivation, shortlist add/remove, source badge state, handoff copy state, and portal navigation.
- Preserve lint and production build as final checks.

## Non-Goals

- No real OTP delivery.
- No live WhatsApp send, CRM handoff, document upload, generation, editing, or PDF delivery.
- No authentication or persisted portal account.
- No backend API contract changes.
