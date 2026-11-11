# ParkSure — Design Decisions

This document explains *why* ParkSure looks and works the way it does. It is the companion to the [README](./README.md) and the [test checklist](./TEST_CHECKLIST.md).

---

## 1. Product framing

ParkSure is a **demo**, not a production parking platform. The goal is to make a complex, multi-sided product feel coherent and premium in a short session:

- a driver should get from “where do I park?” to a revealed bay pass in under a minute;
- an attendant should make one gate decision at a time without reading dense UI;
- an operator should see the lot as a live system and resolve exceptions;
- an administrator should feel that changes are powerful but governed.

Every screen is therefore optimised for **clarity under time pressure** rather than data density. The visual language borrows CRED’s restraint: near-black canvas, warm metallic accent, generous radii, large type, and motion used for confirmation rather than decoration.

The demo is **grounded in Kolkata**. Places use real landmarks and coordinates, plates use West Bengal formats, receipts use a West Bengal GSTIN, and prices reflect plausible Kolkata hourly rates. This makes the product legible to a local reviewer without pretending the data is live.

---

## 2. Visual system

### Tokens

The palette is defined once in `src/styles/index.css` and consumed through Tailwind utilities:

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#0B0B0F` | App canvas |
| `--surface` | `#14141A` | Raised cards and sheets |
| `--accent` | `#E8C26A` | Primary action, driver/attendant/admin accent |
| `--violet` | `#7C5CFF` | Operator accent, secondary glow |
| success / warning / danger / info | muted semantic hues | Status only, never decoration |

- **Gold is the default accent.** It signals value and action.
- **Operator switches to violet** via `data-accent="violet"` on the document root. This gives the operations console a distinct identity without duplicating components.
- **Radii are large (20–28px)** to soften the dense data and make touch targets feel deliberate.
- **Surfaces are layered**, not bordered heavily: `surface-card`, `surface-card-strong`, and glass navigation create depth with low-contrast lines.

### Typography

| Face | Use |
| --- | --- |
| **Space Grotesk** | Headings, display numbers, role names |
| **Inter** | Body, labels, controls |
| **JetBrains Mono** | Plates, amounts, hashes, references |

Monospace for plates and money is a functional choice: it prevents digit ambiguity at a gate and makes receipts and audit hashes scannable.

### Motion

Framer Motion is used for:

- page and sheet transitions;
- the sliding payment confirmation;
- the scratch reveal;
- the 3D tilt on the parking pass;
- count-up statistics and progress rings;
- layout-animated bottom navigation.

`useReducedMotion()` disables tilt, glare, large transitions and the scratch interaction’s motion-dependent feel. Haptics are a progressive enhancement and fail silently on unsupported devices.

---

## 3. Information architecture

### One login, then a role chooser

A single account can hold multiple roles. The chooser is a first-class screen, not a dropdown, because:

- it makes the multi-role nature of the product legible;
- it gives locked roles a place to explain *why* they are locked (“Ask your administrator”);
- it creates a clean hand-off between personal and operational contexts.

The account in the seed data (`admin@demo`) deliberately holds all four roles so reviewers can see both states without switching accounts.

### Bottom navigation by role

| Role | Tabs |
| --- | --- |
| Driver | Find · Trip · Wallet · Me |
| Attendant | Gate · Me |
| Operator | Lot · Alerts · Log · Me |
| Admin | Settings · Log · Me |

The tab count follows the job. The attendant has two tabs because the gate console is the job; everything else is secondary. Cash reconciliation lives under the operator’s Log/Me area because it is a periodic task, not a primary tab.

### Mobile menu and shared footer

The top bar keeps the logo, the account avatar and one menu button. The menu is a bottom sheet containing Support, Privacy, Terms, Switch role and Sign out, so secondary destinations do not compete with the four primary tabs on a narrow screen. A single `SiteFooter` is mounted on every surface: it computes the copyright year at render time, links the legal and role-aware support routes, and makes the support email and phone real `mailto:`/`tel:` links. Contact details are configuration (`VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_PHONE`, `VITE_SUPPORT_PHONE_DISPLAY`) rather than hard-coded strings.

### Route guards

`ProtectedRoute` checks three things in order: authenticated user, chosen role, and role membership. Redirects are `replace` so the back button does not bounce users through a guard loop. The root path resolves to the role home, which makes installed-PWA launches predictable.

---

## 4. The driver journey

### Find → Place → Book → Pass

1. **Find** uses a search field, filter chips and sort options (nearest, most free, cheapest), with a **list/map toggle**. Availability is shown as a labelled badge with an icon, not colour alone. Each card and the selected map pin show the live dynamic rate and a demand badge.
2. **Place detail** shows an embedded OpenStreetMap, a single **OpenStreetMap directions** action, the live bay map, the dynamic rate with its reason, distance, amenities and a clear primary action. Book-now and pre-book are separate intents because their payment rules differ.
3. **Book** is a single scrollable decision: duration, vehicle, price breakdown, then payment. The breakdown separates the base rate, the demand adjustment and the live rate, so the driver can see why the price moved. The primary button opens the shared payment sheet.
4. **Scratch reveal** is the emotional payoff. The bay label is hidden under a gold panel; scratching (or pressing “Reveal”) discloses it, then the user can open the live trip. The interaction is deliberately short and always has a non-gesture fallback.
5. **Trip** is the live pass: tilt card, plate, bay, countdown, embedded map, navigation, extend, exit and cancel. Exit with no overstay completes immediately; overstay opens the payment sheet with an itemised breakdown before releasing the gate.

### Kolkata network

The seed uses four places chosen to span different Kolkata parking contexts:

| Place | Context | Base rate | Why it is in the demo |
| --- | --- | --- | --- |
| Park Street Centre | Central business/leisure | ₹60/hr | Premium multistory near Allen Park |
| Salt Lake Sector V | IT office district | ₹40/hr | Weekday office peak and FASTag exit |
| Howrah Station Forecourt | Transit hub | ₹35/hr | Surface bays, high churn, step-free access |
| Maidan – Victoria Memorial | Open ground/event | ₹30/hr | Camera-only estimate, no individual bay booking |

Internal IDs stay stable (`central`, `north`, `metro`, `lakeside`) so seeded reservations, audit events and smoke-test routes remain valid while the display names change.

### Dynamic pricing

Pricing is deliberately **explainable**, not a hidden algorithm:

- occupancy bands lift the rate at 60% / 75% / 90%;
- Kolkata peak windows (weekday commute, Saturday leisure, Sunday evening) add a small lift;
- the night window (22:00–06:00) applies a discount;
- the multiplier is clamped to 0.85–1.60× and rounded to ₹5 so prices stay believable;
- `PlaceSummary.pricePerHour` is the **effective** rate, while `db.places[].pricePerHour` remains the administrator’s base rate.

The UI always pairs the effective rate with a reason (“78% occupied · weekday evening peak”) and a struck-through base rate when adjusted. This keeps the dynamic model honest and avoids the “why did the price change?” problem common in surge pricing.

### Maps and navigation

- **Leaflet + React Leaflet** was chosen over Google Maps because it needs no API key, works with OpenStreetMap data, and keeps the demo reproducible. Google Maps was removed entirely so there is one navigation provider and no key or billing dependency.
- CARTO dark/light tiles follow the app theme, so the map feels part of the design system rather than an embedded third-party widget.
- Pins encode availability by colour **and** by tooltip text; selecting a pin pans the map and opens a detail card.
- The map is embedded on Find (map view), Place detail and the active Trip pass. Navigation is a **hand-off** to OpenStreetMap/OSRM directions.
- On Android, links open in the Capacitor browser so the back button returns to the app instead of leaving the user stranded in a web view.

### Wallet

The wallet separates **saved methods**, **FASTag balance/top-up**, and **payments/receipts**. Top-up reuses the same payment sheet with a restricted method list, which keeps the payment UX consistent and avoids a second flow.

### Account and profile editing

Profile, vehicles, assigned places, preferences, privacy and session controls share one `AccountPanel`. The exact sentence **“Demo mode: simulated data”** appears in the About section, as required.

**Edit profile** opens a bottom sheet rather than a separate page. The reasoning:

- The account panel is the place people already look for identity settings, and a sheet keeps the workspace visible behind it.
- One component (`ProfileEditSheet`) is used by every role and by both web and Android, so the behaviour cannot drift.
- The form validates with the same zod schema as the API (`profileSchema`), rejects duplicate emails/phones, and writes an audit event with the actor, target and changed fields.
- Avatar tone is a small set of named tokens instead of a file upload: it keeps the demo offline, avoids storing personal images, and still gives a visible, satisfying change.
- Role membership, staff IDs and vehicle plates stay read-only here; those are governance or operational data, not profile data.

### ParkSure Assist

The support assistant is deliberately **not** an LLM integration. It is a deterministic engine in `src/api/support.ts`:

- A curated knowledge library covers booking, pricing, payments, refunds, gates, alerts, audit, privacy, roles and profile editing.
- Questions are normalised (Unicode letters and digits across English, Bengali and Hindi), scored against keywords and role, and the best entry wins with a confidence value.
- Each answer can carry follow-up chips, and the engine blends in **live context**: active reservation or session, vehicle, wallet balance, open alert count and shift.
- The UI says “On-device answer” and explains that nothing is sent to an external AI.

Why: it works offline, has no API cost, cannot leak prompts or personal data, is fully testable, and matches the demo’s local-first architecture. The trade-off is that it cannot answer arbitrary open-ended questions; it falls back to the closest curated topic and offers human contact.

The assistant is reachable three ways — a global floating button, a top-bar icon and the full `/{role}/support` page — so it is discoverable without crowding the primary navigation.

---

## 5. The attendant console

The attendant screen is designed for a gloved hand and a queue:

- **72px minimum controls**, large plate text, and one primary decision per card.
- The ANPR read is always paired with the expected plate. A mismatch is a **blocking warning** with an explicit reason, not a silent rejection.
- Entry, exit, cash collection and manual entry are separate actions so the attendant cannot accidentally combine them.
- Cash is only offered here. Pre-booked exits cannot be settled in cash; the UI explains the rule and offers online settlement instead.
- A refused vehicle can be escalated to an operator, which creates an alert rather than a dead end.

The design principle is **one decision at a time**: the queue card is the unit of work, and resolved cards leave the queue immediately.

---

## 6. The operator console

The lot page combines three layers:

1. **Place summary** — occupancy, free bays, revenue, queue length.
2. **Bay map** — each bay carries a status, a confidence badge and a sensor health cue. Selecting a bay opens a bottom sheet with fusion factors, not just a status.
3. **Exception handling** — mark a sensor faulty, open a ticket, or reassign a reservation. Each action is reason-gated and audited.

The **fusion engine** (`src/utils/fusion.ts`) is intentionally explainable: it lists magnetometer reading, reservation lock, payment state, sensor health and confidence floor. The operator can see *why* a bay is “unknown” instead of trusting a black box.

Alerts are a queue with acknowledge → own → resolve states. Logs combine gate events, payments and audit entries with CSV export so the console feels operational rather than decorative.

---

## 7. The admin console

Admin settings are split into sections: confidence thresholds, payment methods, privacy retention, people & roles, places & pricing, reset, and About.

- **Every change requires a reason.** The reason is written to the audit chain with the actor and target.
- **Payment methods can be disabled globally.** The payment sheet filters them out and explains why a method is unavailable.
- **Places can be added** with a generated bay/sensor layout, which demonstrates that the data model is not hard-coded to the seed.
- **Reset demo data** is destructive and therefore confirmation-gated.
- **Audit log** verifies the hash chain locally, filters by actor, searches across action/target/reason, expands to show previous and current hashes, and exports CSV.

The audit hash is a fast 64-bit demo hash over the previous hash plus the event body. It demonstrates tamper-evidence and chaining; it is **not** a cryptographic signature and should be replaced with SHA-256/HMAC and server-side keys in production.

---

## 8. Payments architecture

### Provider interface

`src/api/paymentProviders.ts` defines a `PaymentProvider` contract with `authorize()`. Each method implements it:

- **FASTag** checks the linked tag and balance.
- **UPI** validates the ID and supports a simulated decline.
- **QR** simulates a scan-and-confirm flow.
- **Card / debit** validates last-4 and supports simulated decline.
- **Cash** is allowed only when the request explicitly permits it and is not pre-booked.

`processPayment()` owns the cross-cutting concerns: amount validation, method enablement, cash policy, UPI validation, idempotency, provider authorisation, receipt creation, FASTag balance updates, saved-method persistence, cash-shift accumulation and audit logging.

### Why slide-to-pay everywhere

A slide gesture is deliberate: it prevents accidental payment on a touch screen and creates a shared ritual across driver, attendant and wallet flows. The component always exposes a keyboard-accessible alternative, and the slide resets on failure.

### Idempotency

Each sheet opening generates an idempotency key. Re-submitting the same attempt returns the existing successful payment and receipt instead of charging twice. A failed attempt is recorded and the user can start a fresh attempt.

### Fallback ladder

After a failure, the sheet lists other enabled methods that have not been tried. This mirrors real payment recovery: the user should not have to restart the whole booking to try a different method.

### Receipts and GST

Successful payments create a receipt with a synthetic GSTIN, 9% CGST + 9% SGST split and a line item. Receipts can be downloaded as PDF via jsPDF. The numbers are demo values and the receipt explicitly says no real payment was processed.

### Refunds

Refunds are separate `Payment` records with `kind: 'refund'` and the original payment is marked `refunded`. This preserves history and makes the audit trail honest.

---

## 9. Data layer

### Local-first mock database

`src/api/db.ts` keeps a single `AppData` object in `localStorage`, cloned on every mutation with `structuredClone`. Components subscribe through `useDB()` (`useSyncExternalStore`), so the simulator, payments, gate actions and admin changes all propagate without prop drilling.

Why not React Query or a real server?

- the demo must run with zero setup;
- a single versioned object makes reset and inspection trivial;
- the service modules (`auth`, `places`, `bookings`, `gate`, `payments`, `alerts`, `admin`, `audit`) already look like an API boundary, so replacing them with `fetch` calls is a page-by-page no-op.

### Seeding

`createSeedData()` returns a complete, internally consistent world: users, roles, Kolkata places, bays, sensors, vehicles, reservations, sessions, payments, receipts, methods, alerts, gate events, shifts, settings and a valid audit chain. `db.ts` clones it on seed/reset so shared array references cannot leak mutations.

The storage key is `parksure.db.v2` with `CURRENT_VERSION = 2`. Bumping the version forces a reseed for reviewers who still have the earlier demo data, without adding a migration step for throwaway data.

### Simulation

`simulateTick()` mutates occupancy, sensor readings and alerts on an interval. It is paused when the tab is hidden and can be disabled in Preferences. This keeps the UI feeling alive without a backend.

---

## 10. PWA, native shell and offline

- `vite-plugin-pwa` generates the manifest and Workbox service worker.
- The app shell and static assets are precached.
- Icons are generated by `scripts/generate-icons.ps1` into 192px, 512px and maskable 512px PNGs.
- Registration is immediate in production so installs pick up updates on the next launch, and is skipped inside the native shell.
- Dev mode does not register the worker; offline behaviour is verified against `npm run preview`.
- **Capacitor** wraps the same `dist/` build as a native Android app. The native project is intentionally thin: status bar, splash screen, external-browser hand-off and location permissions. There is no forked native UI to maintain.
- The debug APK is the test artifact. A signed release build, Play Store metadata and native deep links are out of scope for the demo.

---

## 11. Accessibility decisions

- **Colour is never the only signal.** Every status badge includes text and a shape/pattern (filled square = occupied, ring = free, patterned square = reserved, help icon = unknown).
- **Focus is always visible.** A shared `focus-ring` utility is applied to interactive elements.
- **Sheets are dialogs.** They trap context, expose a close control and restore focus on exit.
- **Touch targets** are at least 48px; the attendant console uses 72px.
- **Reduced motion** is honoured globally.
- **Forms** use labelled fields, hints and error text wired with `aria-describedby`.
- **Navigation** marks the current tab with `aria-current="page"`.
- **Maps** expose a descriptive `aria-label`, labelled locate control and text tooltips for pins. The list view is always available as an equivalent, fully keyboard-operable path, because pointer-only map interaction is not accessible on its own.

Known trade-offs: the OTP input’s middle-digit editing can collapse in some browsers. Dense admin tables now use fixed-width, wrapping cells instead of horizontal scrolling, and filter chips wrap rather than scroll. Map pins are pointer-first; the list view is the accessible fallback. These are documented in the test checklist rather than hidden.

---

## 12. Internationalisation and theming

- Language and theme are persisted in the UI store.
- `useT()` resolves keys from English, Bengali or Hindi dictionaries, with English fallback.
- The theme switch updates `data-theme` and the browser theme-colour meta tag.
- Dark is the default and the design target; light is an optional accommodation.

The dictionaries cover navigation, shared actions, status words and common labels. Long-form operational copy is English in this build; adding translations is a matter of extending the same dictionaries, not restructuring components.

---

## 13. Trade-offs and alternatives considered

| Decision | Alternative | Why this choice |
| --- | --- | --- |
| Local mock DB | MSW + IndexedDB | Zero setup, easy reset, inspectable state, still API-shaped |
| Zustand | Redux Toolkit / Context | Small surface, simple persistence, no boilerplate |
| Single `AppData` object | Normalised tables | Demo scale makes one versioned object simpler to seed and reset |
| Gold/violet accents | Multi-colour role themes | Two accents keep the system coherent while distinguishing operations |
| Slide-to-pay everywhere | Button-only payment | Deliberate gesture reduces accidental charges and unifies flows |
| Scratch reveal | Static confirmation | Creates a memorable payoff while retaining a press fallback |
| Explainable fusion | Single status field | Operators need to understand *why* a bay is uncertain |
| Leaflet + OpenStreetMap | Google Maps SDK | No API key, reproducible, themeable, open data; one provider only |
| Occupancy + peak pricing | Fixed hourly rate | Shows demand pricing while keeping the reason visible |
| Hand-off navigation | Embedded turn-by-turn | Simpler and more reliable; uses the driver’s preferred maps app |
| Capacitor wrapper | React Native rewrite | Reuses the web app and keeps one UI codebase |
| Version bump reseed | Data migration | Demo data is disposable; reseeding is simpler and safer |
| Fast demo hash | SHA-256 via Web Crypto | Synchronous seeding and simple verification; production should use crypto |
| English long copy | Full translation now | Keeps scope realistic while leaving the i18n structure in place |
| Rule-based assistant | External LLM API | Offline, private, zero cost, testable; trades open-ended chat for reliable curated answers |
| Consent-gated local analytics | Third-party tag manager | No tracker payloads or cross-site IDs; reviewer can see and clear every event |
| Sheet-based profile editor | Separate settings page | Keeps context, reuses one component across roles and platforms |
| One CTA on the landing page | Multiple competing actions | A public demo should have an obvious next step; secondary links stay quiet |

---

## 14. Launch readiness

The 20 requested launch items shaped both UI and infrastructure:

- **Public surface.** `/` is a real landing page with one **Open the demo** CTA. `/privacy` and `/terms` are first-class routes, linked from the landing footer, the account panel and the consent banner.
- **Consent.** The banner offers accept and decline as equally real choices. The decision is stored separately from analytics events and can be changed later. Analytics are off by default, local-only, capped and PII-free.
- **SEO and sharing.** Per-route titles/descriptions, canonical, Open Graph, Twitter card, JSON-LD, `favicon.ico`, SVG/PNG favicons, Apple touch icon, a compressed 1200×630 JPEG social image, sitemap and robots are all generated or committed.
- **Security.** HTTPS is enforced in production (private/local hosts exempt), external links are hardened, and hosting configs carry a strict CSP (`script-src 'self'`, no framing or objects), HSTS, COOP/CORP, referrer, permissions and cross-domain-policy headers. `/.well-known/security.txt` gives a disclosure contact. Demo values moved into `src/config/env.ts` with a warning that `VITE_*` is public.
- **Forms.** Zod validation covers every input; sign-in and registration add a hidden honeypot and local rate limits. The UI explains the limits and the demo nature.
- **Quality gates.** `check-contrast.mjs` verifies 38 token pairs against WCAG AA, including the violet operator accent and the light theme. `check-links.mjs` verifies every internal route and built asset. `check-mobile.ps1` loads all 28 routes at 390px and 320px, fails on page-level horizontal scroll or controls outside the viewport, and verifies the menu, footer and contact links. `postbuild.mjs` emits `dist/404.html`.
- **Custom 404.** A branded “This bay does not exist” page replaces the default host error.
- **Performance.** Route-level lazy loading, manual vendor chunks, font preconnect, immutable asset caching and PWA precache keep the first load small.

The trade-off is that bot protection, rate limiting and secret storage are client-side in this static demo. The checklist calls those out as server-side work before a real launch.

---

## 15. Web and Android parity

There is one UI codebase. The Android app is a Capacitor shell around the same `dist/` build:

- `npm run build` produces the web bundle.
- `npx cap sync android` copies `dist/` into `android/app/src/main/assets/public`.
- `npm run android:build` compiles the debug APK.

Because of this, profile editing, ParkSure Assist, the landing page, legal pages, consent, analytics, validation and every visual token are identical on both platforms. The only platform-specific code is the native chrome wrapper (`src/utils/native.ts`), geolocation permissions, and external-link opening through the Capacitor browser. Any web change must be followed by a rebuild so the APK does not drift.

---

## 16. If this became a real product

1. Replace `src/api/*` with HTTP services and a real database; keep the same function signatures.
2. Move secrets, OTP, GSTIN and payment authorisation server-side; never trust client totals.
3. Use SHA-256/HMAC and append-only storage for the audit chain, with server-side keys.
4. Add real gateway webhooks, reconciliation jobs and refund state machines.
5. Add camera/ANPR and sensor integrations behind the existing fusion model.
6. Add end-to-end tests (Playwright) for the payment, gate and admin flows.
7. Complete the Bengali and Hindi dictionaries and add locale-aware number/date formatting.
8. Add telemetry, error boundaries and per-role feature flags.
9. Replace demo pricing with a server-side tariff engine, audit price changes and show a fare breakdown before payment.
10. Add a real maps provider with live traffic, geofenced arrival detection and indoor wayfinding for multistory lots.
11. Ship a signed Android release (AAB), Play Store listing and native push/deep links.
