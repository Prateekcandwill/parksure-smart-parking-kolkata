# Hyperframes Composition Brief: ParkSure

## Objective

Create a short launch-style brag video for ParkSure, the Kolkata smart-parking demo with one account and four workspaces.

## Output

- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 19.5 seconds

## Source Material

- Project root: `C:\Users\ASUS TUF DASH F15\parksure`
- Primary files read: `index.html`, `src/pages/Landing.tsx`, `src/styles/index.css`, `src/api/seed.ts`, `src/utils/pricing.ts`, `src/utils/roles.ts`, `README.md`, `public/favicon.svg`
- Product name: ParkSure
- Tagline / strongest claim: **Park without the wait.**
- Key UI or visual moment to recreate: the dark Kolkata place card — gold bay squares, mono price, hairline borders — and the demand-pricing breakdown that turns a ₹60 base rate into a live ₹80 rate.
- Copy that must appear verbatim:
  - `Park without the wait.`
  - `Demo mode: simulated data.`
  - `One account. Four workspaces.`
  - `Find, book and pay for a bay.`
  - `Run the gate with one clear decision at a time.`
  - `Keep the lot moving and resolve exceptions.`
  - `Set the rules that run every place.`
  - `Peak demand · 1.35×`
  - `83% occupied · weekday evening peak`
  - `Park Street Centre` / `Salt Lake Sector V` / `Howrah Station Forecourt`

## Creative Direction

- Tone preset: `default`
- Creative direction: premium product film that deadpans into operations software
- Interpretation: comfortable 3–5 s scenes, restrained arrivals, confident typography, almost no decoration. The joke is that a demo takes its own back office completely seriously. Motion is quiet and exact; the music carries energy, not the visuals.
- LOOK line: ground `#0B0B0F`; ink `#F6F4EE`; muted `#9A9AA8`; accent `#E8C26A`; second accent `#7C5CFF`; surfaces `#14141A` and `#1B1B23`; hairline `#2C2C37` at 1.5 px; display Space Grotesk 700 at 84–116 px; body Inter 400/600; numerals JetBrains Mono 500; card radii 24 px; one soft radial gold glow at 16–22% opacity; no full-frame linear gradients; no neon, no glassmorphism, no drop shadows beyond a 0 24px 60px black/40% under floating panels.

## The five scenes

1. **Hook — 0.0–3.7 s.** Eyebrow `KOLKATA · SMART PARKING DEMO`; headline `Park without the wait.` with the second line in gold. The Park Street Centre card rises on the right: 12 bay squares, 10 in use, 2 free and pulsing, `2 of 12 free`, `₹80 / hr`, `Peak demand · 1.35×`, `Covered · ANPR entry · 24/7 security`.
2. **Find — 3.7–8.4 s.** Recreated Find screen at video scale: `Find parking`, search field showing `Park Street`, chips `All / Free now / Covered / Camera`, then three real lots arriving one by one — Park Street Centre ₹80, Salt Lake Sector V ₹40, Howrah Station Forecourt ₹35 — with distances and free-bay counts. Left copy: `Find a live bay. See the rate.`
3. **Dynamic pricing — 8.4–12.6 s.** Receipt-style panel: base ₹60.00, occupancy ×1.20, peak window +0.15, multiplier counting to ×1.35, live rate re-landing at ₹80.00 with ₹60 struck through, `Peak demand · 1.35×`, `83% occupied · weekday evening peak`, and an 83% occupancy bar against a 60% demand floor. Left copy: `The rate moves with demand.`
4. **Role reveal — 12.6–16.8 s.** `One account. Four workspaces.` Four cards land left to right on consecutive beats: Driver, Attendant, Operator, Administrator, each with its real one-line description and unlocks line. The Operator card carries the violet accent.
5. **Outro — 16.8–19.5 s.** Centered ParkSure mark and wordmark, `Park without the wait.`, `Kolkata · Web + Android`, then the dry kicker `Demo mode: simulated data.`

## Audio

- Music: `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: enter at 0.0, volume 0.32, 0.4 s fade-in, 0.9 s fade-out under the final line; hold level through the role reveal.
- Music cue guidance: bundled preset cues. Strong cues at 3.70, 8.44, 10.54 and 12.65 s; beat grid 13.18, 13.70, 14.22, 14.76 for the four role cards; 17.91 for the logo landing. Lock the three scene reveals (3.70, 8.44, 12.65) and the price reveal (10.54).
- Audio-reactive treatment: subtle. A single gold radial glow behind the hero card / pricing panel breathes ±8% opacity with low-frequency RMS. No waveform, no equalizer, no particles.
- Audio-coupled moments:
  - Scene 1 card landing — soft impact
  - Scene 1 free-bay lights — two tiny interface ticks
  - Scene 2 chip select — click
  - Scene 2 result rows — three card placements
  - Scene 3 price re-land — light glass tick
  - Scene 4 role cards — four low card placements
  - Scene 5 logo — soft bell ringing over the fading bed
- SFX selection guidance: interface clicks for UI actions, card placements for card-like reveals, one soft impact for the hero card, one bell for the mark. Keep every SFX under the bed; nothing sharper than the music.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density and volume from the implemented animation. Staged options: `assets/sfx/interface/drop_001.ogg`, `click_001.ogg`, `select_008.ogg`, `assets/sfx/casino/card-place-2.ogg`, `assets/sfx/impact/impactSoft_medium_001.ogg`, `impactGlass_light_001.ogg`, `impactBell_heavy_003.ogg`.

## Hyperframes Instructions

- Load `hyperframes`, `hyperframes-registry`, `media-use`, `hyperframes-cli`. `/brag` is its own workflow: no storyline step, no `SPEC.md`, no REVIEW.md. The plan and this brief replace them.
- Keep all text readable; no overflow; WCAG contrast pass required.
- At least one visual element reacts to the music.
- Beat-lock major reveals within ±0.15 s and mark `// beat-locked`; snap sequential items to consecutive beats within ±0.10 s and mark `// beat-grid`.
- Run `npx hyperframes check --json` before render. Fix every error, including contrast.
- Render locally to `brag-output/brag.mp4`.
