# ParkSure — Test Checklist

Use this checklist for a manual QA pass. It assumes a production build (`npm run build`) served with `npm run preview`, or the dev server for interaction testing.

**Demo secrets:** OTP `123456` · password `demo1234` · 3-D Secure code `123456`

**Demo accounts:** `driver@demo` · `attendant@demo` · `operator@demo` · `admin@demo`

---

## 0. Build and environment

- [ ] `npm install` completes without errors.
- [ ] `npm run build` succeeds (TypeScript + Vite + PWA generation).
- [ ] `npm run lint` reports no errors (warnings are acceptable).
- [ ] `npm run preview` serves the app at the printed URL.
- [ ] The browser console has no uncaught errors on first load.
- [ ] `powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1` reports **28/28 PASS** (run after a build).
- [ ] `npm run check:mobile` reports all routes passing at 390px and 320px, plus the menu/footer/contact check.
- [ ] `dist/` does **not** contain `test-login.html` after the smoke test.

---

## 1. First load and PWA shell

- [ ] The app loads in dark mode with the gold accent.
- [ ] The ParkSure logo, wordmark and “Demo” badge are visible.
- [ ] Fonts load: Space Grotesk headings, Inter body, JetBrains Mono plates/amounts.
- [ ] The manifest is linked; DevTools → Application → Manifest shows the name, icons and theme colour.
- [ ] A service worker registers in the production build.
- [ ] Reloading with the network offline still opens the app shell (after one online visit).
- [ ] The browser theme-colour matches the dark canvas.

---

## 2. Authentication

### Sign in — OTP

- [ ] `/sign-in` shows the phone/email field, OTP/password toggle and demo accounts.
- [ ] Entering `driver@demo` and requesting an OTP reveals the OTP step.
- [ ] A wrong 6-digit code shows an inline error and does not sign in.
- [ ] `123456` signs in and lands on `/choose-role`.
- [ ] The OTP input accepts keyboard entry and auto-submits when complete.
- [ ] Resend/back controls work without losing the identifier.

### Sign in — password

- [ ] Switching to Password mode keeps the identifier.
- [ ] A wrong password shows “Demo password: demo1234”.
- [ ] `demo1234` signs in.
- [ ] The password visibility toggle works and is labelled for screen readers.

### Google and registration

- [ ] “Continue with Google” signs in the demo driver account.
- [ ] “New driver? Create an account” opens `/register`.
- [ ] Registration rejects an invalid phone, plate or missing consent.
- [ ] A valid registration creates the driver, signs them in and shows the role chooser.
- [ ] Registering the same phone again is rejected as a duplicate.

### Remember device

- [ ] With “Remember this device” on, the session survives a browser restart (`localStorage`).
- [ ] With it off, the session is limited to the tab (`sessionStorage`).
- [ ] Signing out clears the session and returns to `/sign-in`.

---

## 3. Role chooser and guards

- [ ] `/choose-role` lists all four roles.
- [ ] Roles the account holds are selectable; the rest are visibly **locked** with “Ask your administrator”.
- [ ] `driver@demo` can only open Driver; Attendant/Operator/Admin are locked.
- [ ] `admin@demo` can open all four roles.
- [ ] Choosing a role lands on that role’s home.
- [ ] “Switch role” returns to the chooser from any workspace.
- [ ] Manually visiting another role’s URL as a driver redirects to `/choose-role`.
- [ ] Visiting a protected URL while signed out redirects to `/sign-in`.
- [ ] Visiting `/` while signed in redirects to the active role’s home.
- [ ] An unknown URL shows the role-aware 404 with a working “Back to workspace” link.

---

## 4. Driver — Find and place

- [ ] Find shows the driver’s first name, search, filter chips and sort options.
- [ ] The header names **Kolkata** and the seeded places are Park Street Centre, Salt Lake Sector V, Howrah Station Forecourt and Maidan – Victoria Memorial.
- [ ] Search filters by place name/address/feature; clearing restores results.
- [ ] Sort by nearest / most free / cheapest changes the order.
- [ ] The **List / Map** toggle switches views without losing filters.
- [ ] Each place card shows availability as **text + shape/pattern**, not colour alone.
- [ ] The live rate is shown, with a struck-through base rate and a demand badge when adjusted.
- [ ] The demand badge and reason match the current occupancy/peak state (e.g. “Peak demand · 1.25×”, “Night rate · 0.90×”).
- [ ] Opening a place shows the embedded OpenStreetMap, the live bay map, price, distance and amenities.
- [ ] The map shows pins for all visible places and a tooltip with name, free bays and rate.
- [ ] The locate-me control requests location and drops a “You are here” marker (allow permission when prompted).
- [ ] The single **OpenStreetMap directions** action opens driving directions to the place in a new tab/app.
- [ ] No Google Maps link or SDK request is present anywhere in the UI or network panel.
- [ ] Free, occupied, reserved and unknown bays are distinguishable without colour.
- [ ] Sensor confidence is shown where relevant.
- [ ] “Book now” and “Pre-book” lead to the correct booking intent.

---

## 5. Driver — Booking and payment

### Booking

- [ ] Duration controls update the price breakdown (base, CGST, SGST, total).
- [ ] The breakdown shows the **live rate**, the **base rate** and the **demand adjustment**.
- [ ] Changing occupancy or peak state changes the live rate on the next render.
- [ ] The selected vehicle and plate are shown.
- [ ] The primary action opens the payment sheet.
- [ ] Closing the sheet leaves the booking intact and re-openable.
- [ ] After a successful payment, the sheet closes and the scratch reveal appears.
- [ ] The scratch panel can be scratched with a pointer **and** revealed with a button/keyboard.
- [ ] The revealed bay label is correct and “View trip” opens the live trip.
- [ ] The receipt label records the live rate and, when surging, the peak multiplier.

### Payment methods

- [ ] UPI accepts a valid ID such as `name@bank` and rejects malformed IDs.
- [ ] UPI QR renders a scannable QR and completes on slide.
- [ ] Credit/debit card rejects a number that fails the Luhn check.
- [ ] Card rejects an expired date and a bad CVV.
- [ ] A valid test card requests the 3-D Secure step.
- [ ] `123456` completes 3-D Secure; a wrong code shows an error and clears the input.
- [ ] FASTag is disabled or explains when no tag is linked.
- [ ] FASTag with insufficient balance offers top-up/another method.
- [ ] Cash is **not** offered to the driver.
- [ ] Every method requires the slide-to-pay gesture.
- [ ] The slide resets after a failure.
- [ ] A failed payment shows the failure reason and a fallback ladder of untried methods.
- [ ] A disabled method is filtered out and explained.
- [ ] Re-submitting the same attempt does not create a duplicate payment.

### Receipts

- [ ] A successful payment produces a receipt with number, GSTIN, CGST/SGST and total.
- [ ] The receipt can be downloaded as a PDF.
- [ ] The PDF opens and contains the plate, place, amount and demo disclaimer.
- [ ] The payment appears in Wallet → Payments.

---

## 6. Driver — Trip

- [ ] An active booking shows the live pass with plate, bay and countdown.
- [ ] The pass tilts on mouse movement (desktop) and stays still with reduced motion.
- [ ] The countdown updates and the progress ring advances.
- [ ] The active pass shows an embedded map centred on the place.
- [ ] The **OpenStreetMap directions** button on the trip opens driving directions.
- [ ] Upcoming bookings show a **Navigate to place** action.
- [ ] “Extend” opens a payment sheet for the extension and updates the end time.
- [ ] Exiting with no overstay completes immediately and releases the bay.
- [ ] Exiting with overstay opens an itemised payment sheet before release.
- [ ] Cancelling asks for confirmation, releases the bay and shows refund policy.
- [ ] With no active booking, Trip shows the empty state and a link to Find.
- [ ] After exit, the place’s free-bay count increases (allowing for simulation).

---

## 7. Driver — Wallet and account

- [ ] Saved methods show their labels and default state.
- [ ] A method can be set as default.
- [ ] A method can be removed.
- [ ] FASTag balance is visible and a top-up updates it.
- [ ] Top-up uses the payment sheet with a restricted method list.
- [ ] Payments and receipts are listed newest first.
- [ ] A receipt can be re-opened from the wallet.
- [ ] Refund records (if present) are distinguishable from payments.
- [ ] Me shows profile, vehicles, preferences, privacy and session sections.
- [ ] Vehicles list their plate, make/model, default state and FASTag balance where present.
- [ ] Theme and language preferences persist after reload.
- [ ] The simulation toggle pauses/resumes live updates.
- [ ] About contains the exact sentence **“Demo mode: simulated data”**.
- [ ] Sign out works from Me.

---

## 8. Attendant — Gate

- [ ] `/attendant/gate` loads the queue with large, glove-friendly controls.
- [ ] Entry and exit events are visually distinct.
- [ ] The ANPR read and expected plate are both shown.
- [ ] A plate mismatch is a blocking warning with a clear reason.
- [ ] Confirming a matching entry admits the vehicle and removes the card from the queue.
- [ ] Refusing a vehicle asks for confirmation and records the decision.
- [ ] “Call operator” creates an alert and confirms it.
- [ ] Manual entry validates the plate and creates a gate event.
- [ ] A cash-due exit opens the cash collection sheet.
- [ ] Cash collection updates the shift total and produces a receipt.
- [ ] A pre-booked overstay cannot be settled in cash; online settlement is offered.
- [ ] Online settlement clears the gate event and keeps cash blocked.
- [ ] Empty queue shows a clear “Queue is clear” state.
- [ ] All primary controls meet the 72px target.

---

## 9. Operator — Lot, alerts, log, cash

### Lot

- [ ] The place switcher lists only places the operator is assigned to.
- [ ] Occupancy, free bays, revenue and queue stats render.
- [ ] The bay map reflects free/occupied/reserved/unknown states.
- [ ] Selecting a bay opens a sheet with fusion factors and confidence.
- [ ] “Mark faulty” requires a reason and updates the sensor/bay.
- [ ] “Open ticket” requires a reason and creates an alert/ticket.
- [ ] Reassigning a reservation works and is audited.
- [ ] The operator accent is violet, not gold.

### Alerts

- [ ] Alerts are grouped/filterable and show severity and age.
- [ ] Acknowledge → own → resolve transitions work.
- [ ] Resolving requires a reason.
- [ ] Resolved alerts leave the active queue.
- [ ] The empty state appears when nothing needs attention.

### Log

- [ ] Gate events, payments and audit entries are listed.
- [ ] Filters and search narrow the results.
- [ ] CSV export downloads a well-formed file with headers.
- [ ] The export respects the current filter.

### Cash reconciliation

- [ ] Active and past shifts are listed.
- [ ] Counted cash can be entered and matched against the ledger.
- [ ] A variance is highlighted with text, not colour alone.
- [ ] Reconciling a shift requires a reason and is audited.
- [ ] The empty state appears with no shifts.

---

## 10. Admin — Settings and audit

### Settings

- [ ] Admin sees thresholds, payment methods, retention, people, places, reset and About.
- [ ] Changing a confidence threshold requires a reason and persists.
- [ ] Disabling a payment method removes it from the payment sheet.
- [ ] Changing retention wording persists.
- [ ] Adding a staff member validates name, email, phone and at least one role.
- [ ] Adding a place generates bays/sensors and appears in driver search.
- [ ] Editing a place’s hourly price or booking switch persists.
- [ ] Every change asks for a reason before applying.
- [ ] Reset demo data requires confirmation, restores the seed and keeps the app usable.
- [ ] About contains the exact sentence **“Demo mode: simulated data”** and the demo credentials.

### Audit log

- [ ] The chain reports **Valid** on the seeded data.
- [ ] “Run verification” confirms the chain and reports the number of events.
- [ ] Actor filters and search narrow the list.
- [ ] Expanding an event shows timestamp, reason, previous hash and event hash.
- [ ] CSV export downloads the visible events.
- [ ] New privileged actions (payment, admin change, gate decision) appear at the top.
- [ ] Corrupting `parksure.db.v2` in DevTools and reloading makes verification report a break (then reset the demo).

---

## 11. Cross-cutting behaviour

### Idle and sessions

- [ ] Admin receives a shorter idle timeout (10 minutes) than other roles (30 minutes).
- [ ] An idle warning appears before logout.
- [ ] Idle logout returns to `/sign-in`.
- [ ] Activity (pointer, key, touch, tab focus) resets the timer.

### Simulation

- [ ] Occupancy/alerts change every ~6.5 seconds while visible.
- [ ] Switching tabs pauses updates; returning resumes them.
- [ ] Preferences → simulation toggle stops/starts updates.

### Responsive layout

- [ ] 320px width: no horizontal overflow; bottom nav remains usable.
- [ ] 390–430px (typical phone): primary flows are comfortable.
- [ ] Tablet/desktop: content is centred with a max width; the bottom dock does not stretch awkwardly.
- [ ] Safe-area insets are respected on notched devices.
- [ ] Bottom sheets are scrollable and dismissible on small screens.
- [ ] Filter and suggestion chips wrap onto multiple lines instead of scrolling sideways.
- [ ] Privacy and analytics tables wrap inside the card; they do not create a page-level sideways scroll.
- [ ] The menu button opens the bottom-sheet menu with Support, Privacy, Terms, Switch role and Sign out.
- [ ] The logo is a link back to the role home on every surface.
- [ ] The shared footer shows the current copyright year and its Privacy, Terms and Support links work.
- [ ] The footer support email opens a mail composer and the phone number opens the dialler (`mailto:` / `tel:`).

### Accessibility

- [ ] Tab through the app: every interactive element has a visible focus ring.
- [ ] The skip link appears on focus and jumps to main content.
- [ ] Sheets and dialogs can be closed with Escape.
- [ ] OTP, switch, segmented control and chips are keyboard operable.
- [ ] Status badges pair text with an icon/pattern.
- [ ] Images and decorative icons are hidden from assistive tech where appropriate.
- [ ] With “Reduce motion” enabled, tilt/scratch/parallax are calm and content remains reachable.
- [ ] The map has a descriptive label and the locate control is labelled.
- [ ] The list view provides a fully keyboard-operable equivalent to the map.
- [ ] Zoom to 200% does not hide primary actions.
- [ ] Colour contrast of body text and primary buttons is comfortable in dark and light themes.

### Theme and language

- [ ] Toggling light/dark updates the whole app and persists.
- [ ] The browser theme-colour meta tag updates.
- [ ] Switching to Bengali or Hindi translates navigation/common labels.
- [ ] Language persists after reload.
- [ ] English remains the fallback for untranslated copy.

---

## 12. Known limitations to confirm, not fix

These are accepted for the demo:

- [ ] Editing a middle digit in the OTP input can collapse focus to the end.
- [ ] The audit hash is a fast demo hash, not a cryptographic signature.
- [ ] Long-form page copy is English even when Bengali/Hindi is selected.
- [ ] The simulator is client-side and pauses when the tab is hidden.
- [ ] PDF receipts are generated in the browser and are not emailed.
- [ ] “Remember this device” uses browser storage; clearing site data signs you out.
- [ ] Map pins are pointer-first; the list view is the accessible fallback.
- [ ] Map tiles and navigation links need network access; availability data still works offline.
- [ ] The APK is a debug build, not a signed store release.

---

## 13. Profile editing

- [ ] Open **Me** as each role; **Edit profile** is visible above the privacy card.
- [ ] The sheet is pre-filled with the current name, email, mobile and avatar tone.
- [ ] Clearing the name shows “Enter your full name” and blocks save.
- [ ] Entering a malformed email or a non-Indian mobile shows the field error.
- [ ] Re-using another seeded user’s email or phone is rejected with a clear message.
- [ ] Saving a valid change closes the sheet, shows a success toast and updates the top bar/avatar immediately.
- [ ] Signing out and back in keeps the new values (stored in `parksure.db.v2`).
- [ ] Admin → Audit trail contains a `profile.update` event with the actor and target.
- [ ] Changing the avatar tone updates the Avatar in the account panel and receipts.
- [ ] The same flow works in the Android build.

## 14. ParkSure Assist (on-device support)

- [ ] The gold **Assist** button is visible bottom-right on every signed-in screen and opens the sheet.
- [ ] The top-bar speech-bubble icon opens the full `/{role}/support` page.
- [ ] **Me → Help and legal → ParkSure Assist** opens the same page.
- [ ] The first message greets the user and the “Live context” strip shows the active role/booking.
- [ ] Ask “How do I book a bay?”, “How does dynamic pricing work?”, “Where is my receipt?” and “What data do you store?” — each gets a relevant answer.
- [ ] Ask an unrelated question; the answer says it is the closest local match and offers a human email.
- [ ] Follow-up chips send their prompt and produce a new answer.
- [ ] **New chat** clears the conversation and restores starter prompts.
- [ ] The footer states that answers are on-device and nothing is sent to an external AI.
- [ ] With the network offline, the assistant still answers (no external call).
- [ ] Bengali and Hindi UI labels for the support entry point render without missing keys.
- [ ] Answers reflect live context (e.g. the active booking or wallet balance) when one exists.

## 15. Launch readiness and privacy

- [ ] Signed out, `/` shows the landing page with one primary **Open the demo** CTA.
- [ ] Signed in, `/` redirects to the role home.
- [ ] `/privacy` and `/terms` are readable signed out and are linked from the landing footer and account panel.
- [ ] The cookie banner appears on a fresh profile; **Accept optional analytics** and **Keep analytics off** both dismiss it.
- [ ] Reloading keeps the choice; **Me → Help and legal** shows the saved date and lets you change it.
- [ ] With analytics off, `/admin/analytics` shows the “Analytics are off” card and no events.
- [ ] With analytics on, browse a few routes; events appear and **Clear log** empties them.
- [ ] The analytics table never shows chat text, card numbers or precise location.
- [ ] `npm run check:contrast` reports 38/38 pass.
- [ ] `npm run check:links` reports no broken links.
- [ ] `npm run check:mobile` passes every route at 390px and 320px.
- [ ] `npm run build` creates `dist/404.html`; an unknown path shows the branded 404.
- [ ] `index.html` has a title, description, canonical, OG and Twitter tags; the compressed `og-image.jpg` loads.
- [ ] `favicon.ico`, `favicon.svg`, `favicon-32.png` and `apple-touch-icon.png` all load.
- [ ] `/.well-known/security.txt` loads with a contact and expiry.
- [ ] `/sitemap.xml` and `/robots.txt` load; private workspaces are disallowed.
- [ ] The sign-in and registration forms include the hidden honeypot; repeated attempts show a rate-limit message.
- [ ] In production over HTTP, a non-private host redirects to HTTPS; localhost/LAN previews do not redirect.
- [ ] The deployed response headers include `script-src 'self'`, `frame-ancestors 'none'`, HSTS and `X-Content-Type-Options: nosniff`.
- [ ] Touch targets remain at least 48px (72px in the attendant console) at phone width.

## 16. Android app (debug APK)

Prerequisites: JDK 21, Android SDK (platform 36, build-tools 36.0.0, platform-tools) and `android/local.properties` pointing at the SDK.

### Build

- [ ] `npm run build` succeeds before syncing.
- [ ] `npm run cap:sync` copies `dist/` into `android/app/src/main/assets/public`.
- [ ] `npm run android:build` finishes with `BUILD SUCCESSFUL`.
- [ ] `android/app/build/outputs/apk/debug/app-debug.apk` exists and is ~5 MB.
- [ ] `releases/ParkSure-debug.apk` is the same build (compare SHA-256; current build `F1491C9BB842FAB1CF947612AC6EC7703B58D2CE054B92CE7958C9B4BF2A5386`).
- [ ] `aapt dump badging` reports package `in.parksure.app`, label `ParkSure`, target SDK 36.
- [ ] The badging lists `INTERNET`, `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`.

### Install and launch

- [ ] `adb install -r releases/ParkSure-debug.apk` succeeds on a device/emulator (API 24+).
- [ ] The ParkSure splash screen appears, then the sign-in screen.
- [ ] The status bar is dark with light icons; content is not hidden behind it.
- [ ] Sign in with `driver@demo` / OTP `123456` and reach the role chooser.
- [ ] The driver Find, Place, Book and Trip screens render at phone width without horizontal scroll.
- [ ] The embedded map loads CARTO/OSM tiles.
- [ ] Tapping **OpenStreetMap directions** opens the Capacitor browser; the Android back button returns to ParkSure.
- [ ] The map locate control triggers the Android location permission prompt and, once allowed, shows the user marker.
- [ ] Denying location shows the “Location unavailable” state without crashing.
- [ ] The app resumes cleanly after backgrounding; the session persists if “Remember this device” was on.
- [ ] The Android back button navigates within the app and does not immediately exit from a deep screen.
- [ ] Rotating the device does not reset the web app state.
- [ ] **Me → Edit profile** opens the same sheet and saves successfully on Android.
- [ ] The **Assist** button and `/{role}/support` page behave the same as on the web.
- [ ] The landing page, privacy, terms and consent banner match the web build.
- [ ] After any web change, `npm run build && npx cap sync android && npm run android:build` produces an APK with the same UI.
