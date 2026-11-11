# ParkSure

**Park without the wait.** A mobile-first smart-parking demo for **Kolkata**, with a CRED-inspired dark interface, one login, a role chooser, and four complete role experiences: Driver, Attendant, Operator and Administrator. It ships as an installable PWA **and** as a native Android app via Capacitor.

> **Demo mode: simulated data.** No real sensors, gates, vehicles or payments are involved. Everything runs in the browser against a mock API backed by `localStorage`, and the Android app packages the same web build.

## Open the finished demo

| Where | Link / path |
| --- | --- |
| This computer (preview server) | **http://localhost:4173** |
| Same Wi-Fi (phone or another device) | **http://192.168.29.49:4173** |
| Android APK | [`releases/ParkSure-debug.apk`](./releases/ParkSure-debug.apk) |
| Guided tour, links and assumptions | [`START_HERE.md`](./START_HERE.md) |
| 20-item launch checklist | [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) |

The preview server is started by double-clicking **`start-web.cmd`**, or by running `npm run build` then `npx vite preview --host 0.0.0.0 --port 4173`. The LAN address changes if the machine reconnects to Wi-Fi.

**Web and Android share the same features and UI.** Both are built from this `src/` tree; `npx cap sync android` copies `dist/` into the APK. Rebuild both after any web change.

---

## Highlights

- **One account, four workspaces.** Sign in once, then choose Driver, Attendant, Operator or Admin. Roles the account does not hold stay visibly locked.
- **Kolkata-first demo network.** Real landmarks and coordinates — Park Street Centre, Salt Lake Sector V (Wipro Circle), Howrah Station Forecourt and Maidan – Victoria Memorial — with genuine-feeling INR rates.
- **Dynamic pricing.** Occupancy and Kolkata peak windows adjust the hourly rate, with a visible base rate, multiplier, reason and peak/surge/night labels.
- **Maps and navigation.** An embedded OpenStreetMap (Leaflet + CARTO tiles) map with live availability pins, locate-me, and one-tap OpenStreetMap driving directions. No Google Maps dependency.
- **Premium dark design system.** `#0B0B0F` canvas, raised `#14141A` surfaces, gold (`#E8C26A`) and violet (`#7C5CFF`) accents, 20–28px radii, Space Grotesk / Inter / JetBrains Mono typography.
- **Real-feeling interactions.** Scratch-to-reveal bay pass, 3D tilt parking pass, slide-to-pay, haptics, bottom sheets, skeletons, count-ups and live simulation.
- **Complete parking loop.** Find a bay → book or pre-book → pay → reveal pass → live trip timer → exit, overstay settlement, receipts and refunds.
- **Operations tooling.** ANPR gate console with plate-mismatch handling, live lot map with sensor-fusion confidence, exception queue, gate/payment/audit logs, CSV exports and cash reconciliation.
- **Governance.** Reason-gated admin changes, hash-chained audit trail with local verification, role guards and idle logout.
- **Editable profiles.** Change name, email, mobile and avatar tone from **Me → Edit profile**; zod validation, duplicate checks and an audit event on every save.
- **On-device support.** **ParkSure Assist** answers from a curated help library plus live app context — global button, top-bar icon and a full `/{role}/support` page. No external AI, API key or network call.
- **Launch-ready web.** Public landing page with one CTA, privacy/terms, cookie consent, SEO and social tags, favicon set, sitemap/robots, custom 404, HTTPS and hardened security headers, local consent-gated analytics, honeypot/rate-limit form protection, a mobile menu, a shared footer with clickable email/phone links, and contrast/link/mobile-overflow gates.
- **PWA + Android.** Installable manifest, generated icons, service worker and offline app shell, plus a Capacitor Android project that builds a testable debug APK.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| App | React 19 + TypeScript 7 + Vite 8 |
| Routing | React Router 7 |
| State | Zustand 5 |
| Styling | Tailwind CSS 3.4 + a small global design-token layer |
| Motion | Framer Motion |
| Validation | Zod 4 |
| Icons | Lucide React |
| Maps | Leaflet 1.9 + React Leaflet 5 (OpenStreetMap data, CARTO tiles) |
| QR / PDF | `qrcode.react`, `jsPDF` |
| PWA | `vite-plugin-pwa` (Workbox) |
| Android | Capacitor 8 (`@capacitor/android`, browser, splash-screen, status-bar) |
| Lint | Oxlint |

No backend is required. `src/api/*` is a service layer written so each module can be swapped for real HTTP calls without rewriting the pages.

---

## Quick start

Prerequisites: **Node.js 20.19+ or 22.12+** and npm.

```bash
cd parksure
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build      # type-check + production bundle
npm run preview    # serve dist/ locally
```

### Android app (debug APK)

The native project lives in `android/` and is configured by `capacitor.config.ts` (`appId in.parksure.app`, app name `ParkSure`, `webDir dist`).

Prerequisites: **JDK 21** and the **Android SDK** (platform 36, build-tools 36.0.0, platform-tools). Set `JAVA_HOME`, `ANDROID_HOME`/`ANDROID_SDK_ROOT`, and add `%JAVA_HOME%\bin` plus `%ANDROID_HOME%\platform-tools` to `PATH`. Create `android/local.properties` with `sdk.dir=<your SDK path>` if Gradle cannot find it.

```bash
npm run cap:sync       # build the web app and copy dist/ into android/
npm run android:build  # cap:sync, then gradlew assembleDebug
npm run android:install # adb install -r the debug APK to a connected device
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk` and is also copied to **`releases/ParkSure-debug.apk`** for easy sharing. Install it with `adb install -r releases/ParkSure-debug.apk`, or copy it to an Android phone and allow installs from that source. It is a debug build signed with the default debug key — suitable for testing, not for store distribution. See [`releases/INSTALL.md`](./releases/INSTALL.md) for the packaged build's metadata and install steps.

### Other scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` then `vite build` (includes PWA generation) and `postbuild` SPA 404 copy |
| `npm run preview` | Serve the production build |
| `npm run check` | Contrast and internal-link gates |
| `npm run check:contrast` | WCAG AA contrast check for design tokens (38 pairs) |
| `npm run check:links` | Route and built-asset link check |
| `npm run check:mobile` | Headless Chrome overflow, mobile-menu, footer and contact-link check at 390px and 320px (run `npm run build` first) |
| `npm run lint` | Oxlint |
| `npm run cap:sync` | Build the web app, then `cap sync android` |
| `npm run android:open` | Open the Android project in Android Studio |
| `npm run android:build` | Build the debug APK with Gradle |
| `npm run android:install` | Install the debug APK over `adb` |
| `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1` | Headless Chrome smoke test for 28 routes (run `npm run build` first) |
| `powershell -ExecutionPolicy Bypass -File .\scripts\generate-icons.ps1` | Regenerate PWA PNG icons |
| `powershell -ExecutionPolicy Bypass -File .\scripts\generate-brand-assets.ps1` | Regenerate favicon, Apple touch icon and OG image |

The smoke test starts its own preview server, writes a temporary session helper into `dist/`, tests every role route with a fresh browser profile, then removes the helper. It requires Chrome at the standard Windows install path. `scripts/check-mobile.ps1` uses the same approach in iframes and fails on page-level horizontal scroll or a tappable control outside the viewport, then verifies the mobile menu, footer links, dynamic copyright and `mailto:`/`tel:` contact links. The build also runs `scripts/postbuild.mjs`, which copies `dist/index.html` to `dist/404.html` so static hosts serve the SPA on unknown routes.

---

## Demo credentials

| Workspace | Email | Roles on the account |
| --- | --- | --- |
| Driver | `driver@demo` | Driver |
| Attendant | `attendant@demo` | Attendant |
| Operator | `operator@demo` | Operator |
| Administrator | `admin@demo` | Driver, Attendant, Operator, Admin |

- **OTP:** `123456`
- **Password:** `demo1234`
- **3-D Secure code at payment:** `123456`
- **Continue with Google:** signs in the demo driver account.
- **Register:** creates a new driver account with a vehicle plate and consent.

`admin@demo` intentionally holds all four roles so the role chooser and locked-role states can be demonstrated from one account. Seed identities are Kolkata-based (Aritra Sen, Sujit Das, Rituparna Ghosh, Debargha Mitra) with West Bengal plates such as `WB 06 AR 1234`.

---

## Routes

| Path | Workspace | What it does |
| --- | --- | --- |
| `/` | Public | Landing page with one **Open the demo** CTA; signed-in users redirect to their role home |
| `/sign-in` | Public | OTP or password sign-in, Google demo, remember-device choice, honeypot + rate limit |
| `/register` | Public | Driver registration with plate + consent, schema validation, honeypot + rate limit |
| `/privacy` | Public | Privacy policy and local-storage retention detail |
| `/terms` | Public | Terms and conditions for the demo |
| `/choose-role` | Signed in | Unlocked role cards, locked roles, switch role, sign out |
| `/driver/find` | Driver | Kolkata places with list/map toggle, search, filters, live availability and dynamic prices |
| `/driver/place/:placeId` | Driver | Place detail, embedded map, OpenStreetMap directions, live bays and dynamic pricing |
| `/driver/book/:placeId` | Driver | Duration, vehicle, live-rate breakdown, payment, scratch reveal |
| `/driver/trip` | Driver | Live pass, timer, embedded map, navigation, extend, exit, overstay payment, cancel |
| `/driver/wallet` | Driver | Saved methods, FASTag balance/top-up, receipts, refunds, GST PDF |
| `/driver/me` | Driver | Editable profile, vehicles, preferences, privacy, support, session, About |
| `/driver/support` | Driver | Full-page ParkSure Assist on-device support |
| `/attendant/gate` | Attendant | ANPR queue, plate confirmation, mismatch handling, cash collection |
| `/attendant/me` | Attendant | Shift identity, assigned place, preferences, session |
| `/attendant/support` | Attendant | Full-page ParkSure Assist on-device support |
| `/operator/lot` | Operator | Live lot map, fusion confidence, sensor faults, reassignment |
| `/operator/alerts` | Operator | Acknowledge / own / resolve exceptions |
| `/operator/log` | Operator | Gate, payment and audit trail with CSV export |
| `/operator/cash` | Operator | Cash shift reconciliation |
| `/operator/me` | Operator | Operator account and session |
| `/operator/support` | Operator | Full-page ParkSure Assist on-device support |
| `/admin/settings` | Admin | Thresholds, payment methods, retention, people, places, reset |
| `/admin/analytics` | Admin | Consent-gated, local-only usage analytics and recent events |
| `/admin/log` | Admin | Hash-chain audit log, verification, filters, CSV export |
| `/admin/me` | Admin | Administrator account and session |
| `/admin/support` | Admin | Full-page ParkSure Assist on-device support |

Unknown paths render a role-aware 404 page (`src/pages/NotFound.tsx`); `npm run build` also emits `dist/404.html` for static hosts.

---

## How the demo works

### Authentication and sessions

- One login for every role. The role chooser then grants access only to roles on the account.
- “Remember this device” stores the session in `localStorage`; otherwise it uses `sessionStorage`.
- Idle logout: **10 minutes for Admin**, **30 minutes for every other role**.
- Route guards redirect unauthenticated users to `/sign-in`, signed-in users without a role to `/choose-role`, and role mismatches back to `/choose-role`.

### Mock API and data

- `src/api/db.ts` owns a versioned `localStorage` database (`parksure.db.v2`), seeded on first run and exposed through `useDB()` via `useSyncExternalStore`.
- Seed data includes four Kolkata places, 38 bays, users, vehicles, reservations, sessions, payments, GST receipts, saved methods, alerts, gate events, cash shifts and a valid hash-chained audit trail.
- The simulator mutates occupancy, bay state and alerts every 6.5 seconds while the tab is visible. It can be paused in Preferences.
- Admin → Settings → **Reset demo data** restores the seed. This is reason-gated and audited.

### Kolkata demo network

| Place | Area | Coordinates | Base rate | Type |
| --- | --- | --- | --- | --- |
| Park Street Centre | Park Street, near Allen Park | 22.5535, 88.3520 | ₹60/hr | Multistory, 2 levels |
| Salt Lake Sector V | Wipro Circle, Bidhannagar | 22.5867, 88.4173 | ₹40/hr | Multistory, 3 levels |
| Howrah Station Forecourt | Howrah Station, Kolkata 711101 | 22.5839, 88.3425 | ₹35/hr | Surface, 10 bays |
| Maidan – Victoria Memorial | Victoria Memorial Grounds | 22.5448, 88.3426 | ₹30/hr | Camera-only open ground |

Internal place IDs (`central`, `north`, `metro`, `lakeside`) are unchanged so routes, guards and the seeded audit trail stay stable. Prices are realistic Kolkata hourly rates and are configured as **base** rates; the displayed rate is adjusted dynamically.

### Dynamic pricing

`src/utils/pricing.ts` computes a live hourly rate from the administrator-configured base rate:

- **Occupancy** — 1.10× at the pricing threshold (default 60%), 1.20× at 75%, 1.35× at 90%.
- **Kolkata peak windows** — weekday 09:00–12:00 and 17:00–21:00 (+0.15×), Saturday 11:00–21:00 (+0.10×), Sunday 16:00–21:00 (+0.10×).
- **Night discount** — 22:00–06:00 (−0.10×).
- The multiplier is clamped to 0.85–1.60× and the effective rate is rounded to ₹5.
- `PlaceSummary` exposes `basePricePerHour`, `demandMultiplier`, `pricingLabel`, `pricingReason`, `isPeak`, `isSurge` and `isDiscount`; `pricePerHour` is the **effective** rate. `db.places[].pricePerHour` remains the admin-configured base.
- The UI shows the effective rate, a struck-through base rate when adjusted, and a demand badge (peak/high demand, night rate, or standard).

### Maps and navigation

- `src/components/map/PlaceMap.tsx` renders Leaflet + React Leaflet over OpenStreetMap data with CARTO dark/light tiles that follow the app theme.
- Pins are colour-coded by availability and show name, free bays and live rate in a tooltip. The map fits all places and pans to the selected one.
- A **locate-me** control uses the browser geolocation API; Android builds request `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION`.
- `src/utils/navigation.ts` builds OpenStreetMap/OSRM driving directions and opens them in a new tab on the web or the Capacitor browser on Android. Google Maps links were removed so there is a single, key-free navigation provider.
- Maps are available on Find (map view), Place detail and the active Trip pass; upcoming bookings also get a navigate action.
- Tiles and directions need network access; availability data still works offline.

### Payments

Supported methods: **UPI**, **UPI QR**, **credit card**, **debit card**, **FASTag**, and **cash** (attendant-assisted only).

- Every payment uses **slide-to-pay**.
- Cards validate with the **Luhn algorithm**, expiry check and CVV format.
- UPI IDs validate against `name@bank`-style rules.
- A successful online payment may require a **3-D Secure OTP** (`123456`).
- FASTag checks the linked tag and balance; top-ups update the stored balance.
- Failed attempts offer a **fallback ladder** of other enabled methods; cash is blocked for pre-booked slots.
- Payments are **idempotent** per attempt key, and successful payments create a **GST receipt** with a downloadable PDF.
- Refunds are recorded as separate payment records and the original is marked refunded.
- Admin can disable individual payment methods; the payment sheet respects that setting.
- Cash collected by an attendant is added to the active cash shift for reconciliation.

### Profile editing

- **Me → Edit profile** opens `src/components/account/ProfileEditSheet.tsx` in a bottom sheet.
- Fields: full name, email address, Indian mobile number and avatar tone (gold, violet, green, blue).
- `profileSchema` in `src/utils/validation.ts` enforces name length, email shape and a 10-digit Indian mobile number.
- `updateProfile()` in `src/api/auth.ts` rejects duplicate emails and phone numbers held by other users, updates the user record, and appends an audit event.
- The change is shared across all four workspaces because they read the same user record; the top bar, avatar, account panel and receipts update immediately.
- The same component is used by the web app and the Android build.

### ParkSure Assist (on-device support)

- `src/api/support.ts` is a deterministic help engine: curated knowledge entries, keyword scoring, follow-up suggestions and live context (active booking, vehicle, wallet balance, open alerts, shift, role).
- `src/components/support/SupportChat.tsx` renders the chat; `SupportAssistant.tsx` mounts a global **Assist** button in `AppShell`; `src/pages/support/Support.tsx` is the full page at `/{role}/support`.
- There is also a speech-bubble shortcut in the top bar and a **Help and legal** card in the account panel.
- **No external AI provider, API key or network request is used.** The UI labels answers “On-device answer” and the footer states that nothing is sent to an external AI.
- The assistant can answer offline because the library ships with the bundle; it cannot look up real records.

### Launch readiness, privacy and analytics

- Public landing page at `/` with one primary **Open the demo** CTA; signed-in users redirect to their role home.
- `/privacy` and `/terms` are public. `src/components/legal/CookieConsent.tsx` offers a real accept/decline choice, stored in `src/store/consent.ts` and editable in **Me → Help and legal**.
- Optional analytics in `src/utils/analytics.ts` are local-first, capped at 250 events, contain no chat/payment/location data, and stay off until consent. Admin sees them at `/admin/analytics`.
- SEO: `index.html` carries title, description, canonical, Open Graph, Twitter card and JSON-LD; `src/components/seo/PageMeta.tsx` / `RouteMeta.tsx` set per-route titles; `public/sitemap.xml`, `public/robots.txt`, `favicon.ico`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` and the compressed `og-image.jpg` ship in the build.
- Security: `src/utils/security.ts` redirects production HTTP to HTTPS and hardens external links; `public/_headers`, `vercel.json` and `netlify.toml` carry a strict CSP (`script-src 'self'`, `frame-src 'none'`, `frame-ancestors 'none'`, `object-src 'none'`), HSTS, COOP/CORP, referrer, permissions and cross-domain-policy headers. `public/.well-known/security.txt` gives a disclosure contact.
- Contact and navigation: a shared `SiteFooter` computes the copyright year at runtime, links Privacy/Terms/role-aware Support, and exposes the support email and phone as real `mailto:`/`tel:` links. The top bar has a mobile menu with Support, Privacy, Terms, Switch role and Sign out, plus a clickable logo.
- Form protection: hidden honeypot field (`src/components/security/Honeypot.tsx`) plus client-side rate limits (`src/utils/abuse.ts`) on sign-in and registration. A production deployment must also enforce these server-side.
- Quality gates: `npm run check:contrast` (38/38 WCAG AA pairs), `npm run check:links` (all internal routes and built assets) and `npm run check:mobile` (28 routes at 390px and 320px, plus menu/footer/contact checks). `npm run build` emits `dist/404.html`.
- See [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) for the full 20-item map.

### PWA and offline

- `manifest.webmanifest` defines the installable app, theme colour, portrait orientation and maskable icon.
- Workbox precaches the app shell and generated assets. The installed app can open offline; simulated actions still run locally.
- Service-worker registration happens in `src/main.tsx` and is skipped inside the native shell.

### Native Android shell

- `capacitor.config.ts` sets `appId in.parksure.app`, app name `ParkSure`, `webDir dist`, the `https` Android scheme and splash/status-bar styling.
- `src/utils/native.ts` configures the status bar and hides the splash screen on native launch; it is a no-op on the web.
- `npx cap sync android` copies `dist/` into `android/app/src/main/assets/public` and updates the three Capacitor plugins.
- The manifest adds `INTERNET`, `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`; the app is built with compile/target SDK 36 and min SDK 24.
- External map links open in the Capacitor browser, so the Android back button returns to ParkSure.

### Accessibility

- Semantic landmarks, skip link, labelled controls and `aria-current` navigation.
- Visible focus rings and keyboard-operable sheets, switches, segmented controls and OTP input.
- Status is never conveyed by colour alone: every badge pairs a label with an icon or pattern.
- Minimum 48px touch targets (72px on the attendant gate console).
- `prefers-reduced-motion` disables tilt, parallax and large motion.
- WCAG AA-minded contrast in both dark and optional light themes.

### Internationalisation

- English, Bengali and Hindi dictionaries live in `src/i18n/strings.ts`, with a persisted language preference.
- Navigation, shared actions, status words and common labels are translated. Long-form operational copy remains English in this demo; new strings can be added to the same dictionaries without restructuring pages.

---

## Project structure

```
parksure/
├─ public/
│  ├─ favicon.ico, favicon.svg, favicon-32.png, apple-touch-icon.png, og-image.jpg
│  ├─ icons/                 # generated PWA icons
│  ├─ robots.txt, sitemap.xml
│  ├─ _headers, _redirects   # static-host security + SPA rules
│  ├─ .well-known/security.txt
│  └─ manifest.webmanifest   # generated at build time
├─ scripts/
│  ├─ generate-icons.ps1
│  ├─ generate-brand-assets.ps1
│  ├─ check-contrast.mjs
│  ├─ check-links.mjs
│  ├─ check-mobile.ps1
│  ├─ postbuild.mjs
│  └─ smoke-test.ps1
├─ src/
│  ├─ api/                   # mock backend: db, auth, places, bookings,
│  │                         # gate, payments, providers, alerts, admin,
│  │                         # audit, simulation, support
│  ├─ components/
│  │  ├─ account/            # shared account panel + profile editor
│  │  ├─ auth/               # role cards, route guard
│  │  ├─ brand/              # logo
│  │  ├─ common/             # stat tiles
│  │  ├─ layout/             # app shell, navigation, mobile menu, site footer
│  │  ├─ legal/              # cookie consent, legal layout
│  │  ├─ map/                # OpenStreetMap/Leaflet place map
│  │  ├─ parking/            # bay map, dynamic price badges
│  │  ├─ payments/           # payment sheet, receipts, cash collection
│  │  ├─ security/           # honeypot field
│  │  ├─ seo/                # PageMeta, RouteMeta
│  │  ├─ support/            # ParkSure Assist chat + global launcher
│  │  └─ ui/                 # buttons, cards, sheets, badges, OTP,
│  │                         # scratch reveal, tilt card, skeletons…
│  ├─ config/                # env-backed demo config
│  ├─ hooks/                 # current user, idle logout, simulation,
│  │                         # active place, delayed ready
│  ├─ i18n/                  # dictionaries + useT
│  ├─ pages/                 # landing, auth, driver, attendant, operator,
│  │                         # admin, legal, support, 404
│  ├─ store/                 # auth, UI preferences, consent, toasts
│  ├─ styles/                # design tokens + global CSS
│  ├─ types/                 # shared TypeScript data model
│  └─ utils/                 # format, validation, plates, hash, PDF, CSV,
│                            # pricing, navigation, security, analytics,
│                            # abuse, native chrome…
├─ android/                  # Capacitor Android project
├─ releases/                 # packaged debug APK + INSTALL.md
├─ wireframes/               # low-fi wireframe sheet + presentation page
├─ brag-output/              # launch video, poster, share copy, Hyperframes project
├─ capacitor.config.ts
├─ DESIGN_DECISIONS.md
├─ LAUNCH_CHECKLIST.md
├─ START_HERE.md
├─ TEST_CHECKLIST.md
├─ start-web.cmd             # one-click build + preview server
├─ vercel.json, netlify.toml, .env.example
└─ vite.config.ts            # PWA manifest/workbox + @ alias
```

---

## Wireframes

A low-fidelity, black-and-white layout set covers the five core mobile screens: home dashboard, search and filter, place detail, profile and settings. It is intentionally grayscale, uses placeholder blocks for imagery and maps, and documents layout, hierarchy and flow before visual design. It is not part of the app bundle.

| File | Use |
| --- | --- |
| `wireframes/index.html` | Presentation page: the sheet, per-screen notes, primary flow, layout rules and palette |
| `wireframes/parksure-wireframes.svg` | Vector source, 1720 × 1000 (five frames at 390 × 844) |
| `wireframes/parksure-wireframes.png` | 2× raster export, 3440 × 2000 |

Open the presentation page directly in a browser, or print it to PDF for review.

---

## Launch video

A 20-second, 1920 × 1080 launch film made with Hyperframes. It runs through the hook, the find screen, the demand-pricing breakdown, the four roles and the closing mark, with a music bed and interface sound effects. Everything on screen is a recreation of the app's real UI, places and pricing math.

| File | Use |
| --- | --- |
| `brag-output/brag.mp4` | Final render, 20.2 s, H.264 with AAC audio |
| `brag-output/brag.jpg` | Poster frame, also baked into frame 0 of the MP4 |
| `brag-output/share-copy.txt` | Ready-to-post caption |
| `brag-output/composition/` | Editable Hyperframes project (`index.html` + assets) |
| `brag-output/brag-plan.md`, `composition-brief.md` | Storyboard, creative direction and audio plan |

To revise or re-render, open `brag-output/composition/` and run `npm run dev` for the preview or `npm run render` to re-export.

---

## Notes and limitations

- All data is local to the browser profile. Clearing site data or resetting the demo restores the seed.
- There is no network latency beyond small artificial delays; the simulator is deterministic enough for demos but not a load test.
- PDF receipts are generated client-side with jsPDF.
- The service worker is production-only and is skipped inside the Android shell; `npm run dev` does not test offline behaviour.
- The map needs network access for CARTO tiles and OpenStreetMap directions; availability data still works offline.
- The debug APK is signed with the default debug key and is intended for testing, not Play Store distribution.
- The smoke and mobile checks are Windows PowerShell helpers and are not part of the app bundle.
- ParkSure Assist is rule-based, not a language model. It handles common help topics well and falls back to the closest match for anything else.
- Analytics are local to the device unless `VITE_ANALYTICS_ENDPOINT` is configured. They never include chat text, payment details or precise location.
- Bot protection is client-side only (honeypot + local rate limits). A real deployment must add server-side validation and rate limiting.
- `https://parksure.example` is a placeholder in `index.html`, `robots.txt`, `sitemap.xml` and the OG tags. Replace it with the real HTTPS domain before launch.
- The CSP allows `'unsafe-inline'` for styles only (React and Framer Motion set inline styles); scripts are locked to `'self'`. Production can tighten styles with nonces or hashes.

See [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) for the reasoning behind the interface and architecture, and [TEST_CHECKLIST.md](./TEST_CHECKLIST.md) for a manual QA script.

---

## Assumptions

These choices were made without further questions, as requested:

1. **Market, city and currency.** Kolkata-first demo: real landmarks/coordinates, West Bengal plates, INR, GST at 9% CGST + 9% SGST, FASTag, UPI.
2. **Single demo identity for all roles.** `admin@demo` holds every role so the role chooser can show both unlocked and locked states from one login.
3. **Fixed demo secrets.** OTP `123456`, password `demo1234` and 3-D Secure code `123456` are intentionally public and shown in the UI.
4. **Cash policy.** Cash is attendant-assisted only and is rejected for pre-booked slots; online methods are always available unless an admin disables them.
5. **Idle policy.** Admin times out after 10 minutes; all other roles after 30 minutes.
6. **Simulation cadence.** Live occupancy and alerts refresh every 6.5 seconds while the tab is visible, and can be paused.
7. **Session storage.** “Remember this device” uses `localStorage`; otherwise the session lives in `sessionStorage` for the tab.
8. **i18n scope.** The language switcher and dictionaries are production-shaped, but only shared/navigation copy is fully translated; long-form operational text stays English for this build.
9. **Light theme.** Included as an optional preference; dark is the default and the designed-for experience.
10. **No real integrations.** Sensors, ANPR cameras, gates, payment gateways, SMS/email OTP and Google sign-in are simulated locally.
11. **PWA icons.** Generated with a small PowerShell/System.Drawing script so the repository stays reproducible without binary editing tools.
12. **Seed content.** Staff names, plates, amounts, receipts and timestamps are fictional demo data; place names and coordinates reference real Kolkata locations.
13. **Pricing model.** Dynamic pricing uses occupancy plus Kolkata peak/night windows with a clamped multiplier and ₹5 rounding; it is illustrative, not a real tariff.
14. **Maps.** OpenStreetMap data is rendered with Leaflet and CARTO tiles; navigation hands off to OpenStreetMap/OSRM rather than embedding turn-by-turn routing. Google Maps was deliberately removed so there is one key-free provider.
15. **Android artifact.** The APK is a debug build for testing, packaged at `releases/ParkSure-debug.apk`; a signed release build is out of scope.
16. **Profile editing scope.** Name, email, mobile and avatar tone are editable. Role membership, staff IDs and vehicle plates stay read-only in the demo; vehicles are managed from the Vehicles card.
17. **Support assistant.** Implemented as a deterministic on-device help library plus live app context, not an external AI API. It is intentionally offline and private.
18. **Analytics.** Local-first and consent-gated, with an optional first-party endpoint. No third-party analytics, advertising or tracking scripts are included.
19. **Demo links.** `http://localhost:4173` and the LAN address are the shareable links for this environment; no public HTTPS host was provisioned.
20. **Launch-readiness scope.** The 20 requested items are implemented as a static-site demo. Real TLS, server-side rate limiting, secret storage and a production CSP remain deployment tasks.
