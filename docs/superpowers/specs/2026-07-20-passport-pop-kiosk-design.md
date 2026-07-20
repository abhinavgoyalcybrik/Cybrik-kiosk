# Passport Pop Kiosk Design

## Goal

Replace launch/portal-first experience with direct, colorful student kiosk. Help walk-in students compare universities, adjust preferences, inspect documents, then request a handoff.

## Route policy

- `/` renders kiosk explorer.
- `/kiosk` redirects to `/`.
- `/portal` redirects to `/`; no student portal UI remains public.

## Entry and data flow

1. Student lands in anonymous explorer; no phone or OTP gate for browsing.
2. App loads catalog through existing kiosk catalog service. Visible source badge says `Live catalog` or `Demo catalog`.
3. Default preference values create initial matches. Student changes collapsed preference controls; matching refreshes locally from loaded catalog.
4. Student selects or shortlists a university. Right panel updates its selected-program requirement summary and existing document checklist.
5. Phone and OTP flow begins only after `Prepare handoff preview`; preview language remains truthful until a confirmed API response exists.

## Desktop layout

```
┌──────────────────────┬─────────────────────────────────────┬──────────────────────┐
│ Preferences          │ University matches                  │ Required documents   │
│ collapsible sections │ destination-ticket result cards     │ selected-program kit │
│ 20%                  │ 56%                                 │ 24%                  │
└──────────────────────┴─────────────────────────────────────┴──────────────────────┘
```

- Preferences: collapsible full panel plus collapsible sections for destination, program, academic profile, budget, and intake. Controls preserve existing profile contract.
- Matches: selected-result detail stays inline; ticket cards show match percentage, university, course, destination, fee, intake, and shortlist action.
- Documents: `buildDocumentChecklist(profile)` is base list. Selected course adds visible minimum English-score/academic context only when catalog data provides it. Do not claim university-specific document requirements not in catalog data.
- Tablet/mobile: matches remain page body. Preferences and documents become separately opened drawer panels; controls retain 48px minimum targets.

## Visual system

- Ink: `#171237`
- Signal violet: `#634CFF`
- Electric lime: `#C4FF4D`
- Route sky: `#26B4F6`
- Route coral: `#FF6D8F`
- Intake mango: `#FFE19B`
- Canvas: `#F7F6FF`

Display type uses Plus Jakarta Sans, body uses Plus Jakarta Sans, utility data uses JetBrains Mono. White/lavender canvas provides reading space; indigo top bar anchors brand. Lime stays reserved for primary action and ready-state confirmation.

### Signature

University cards are destination tickets: slim country-color route stripe, destination label, program facts, and a color-coded match score. This gives study-abroad browsing a recognisable travel artifact without making normal controls noisy.

## Accessibility and motion

- Every input and accordion button has accessible name, visible focus, and 48px touch target.
- Color never carries state alone; status uses text/icon too.
- `prefers-reduced-motion` removes decorative ticket shifts and drawer transition.

## Tests

- Root route renders direct kiosk explorer.
- `/kiosk` and `/portal` redirect to `/`.
- Preferences panel and sections open/close with accessible button state.
- Selecting a university updates selected-program requirement context.
- Catalog source is labelled accurately; handoff preview claims no delivery.

## Scope limits

- No Django/backend endpoint change.
- No file upload, WhatsApp delivery, PDF delivery, CRM delivery, or portal implementation.
- Existing OTP/session API remains used only at handoff request.
