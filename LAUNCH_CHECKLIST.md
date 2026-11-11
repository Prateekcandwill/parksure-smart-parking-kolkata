# ParkSure — website launch checklist

All 20 requested launch-readiness items are implemented in this build. Each row
names the user-visible behaviour and the file that owns it.

| # | Item | Status | Where it lives / how to verify |
| --- | --- | --- | --- |
| 1 | Privacy policy | Done | `/privacy` page (`src/pages/legal/Privacy.tsx`). Linked from landing, footer, account panel, consent banner and analytics page. |
| 2 | Terms and conditions | Done | `/terms` page (`src/pages/legal/Terms.tsx`). Linked in the same places. |
| 3 | Secrets off the frontend | Done | Demo values are in `src/config/env.ts` with `VITE_*` overrides; `.env.example` warns that `VITE_*` is public. No gateway/DB/signing secret exists in the bundle. |
| 4 | HTTPS | Done | `src/utils/security.ts` redirects production HTTP to HTTPS (private/local hosts exempt). HSTS and upgrade headers in `public/_headers`, `vercel.json`, `netlify.toml`; `public/.well-known/security.txt` gives a disclosure contact. |
| 5 | Cookie consent | Done | `src/components/legal/CookieConsent.tsx` + `src/store/consent.ts`. Accept and decline are both real choices, remembered and editable in **Me → Help and legal**. |
| 6 | Meta titles and descriptions | Done | `index.html` title/description/author/robots/canonical; `src/components/seo/PageMeta.tsx` and `RouteMeta.tsx` set per-route titles. |
| 7 | Social preview | Done | Open Graph and Twitter tags in `index.html`; compressed `public/og-image.jpg` (1200×630, ~77 KB) generated from the brand source by `scripts/generate-brand-assets.ps1`. |
| 8 | Favicon | Done | `public/favicon.ico`, `public/favicon.svg`, `public/favicon-32.png`, `public/apple-touch-icon.png`, plus PWA icons in `public/icons/`. |
| 9 | Sitemap and robots | Done | `public/sitemap.xml`, `public/robots.txt` (private workspaces disallowed). |
| 10 | Image alt text | Done | Informative images use `alt`; decorative icons use `aria-hidden`. OG/Twitter image alts are set. |
| 11 | Image compression | Done | PNG brand assets are generated at display size (32px, 180px) by `scripts/generate-brand-assets.ps1`; the 1200×630 social image is served as a ~77 KB JPEG instead of a ~116 KB PNG. No oversized hero bitmaps ship. |
| 12 | Page speed | Done | Route-level `lazy()` splitting, Vite `manualChunks` for react/motion/maps/pdf/icons, long-lived asset caching in `_headers`/`vercel.json`, font preconnect and PWA precache. |
| 13 | Contrast | Done | `scripts/check-contrast.mjs` — 38/38 pairs pass WCAG AA (text 4.5:1, violet accent and light theme included). Run `npm run check:contrast`. |
| 14 | Mobile friendliness | Done | Mobile-first layout, safe-area padding, 48/72px touch targets, bottom navigation, a top-bar menu sheet, wrapping chips, fixed-width wrapping tables, shared footer and bottom sheets. `scripts/check-mobile.ps1` verifies all 28 routes at 390px and 320px with no page-level horizontal scroll. Android Capacitor shell included. |
| 15 | Custom 404 | Done | `src/pages/NotFound.tsx` renders a branded “This bay does not exist” page. `scripts/postbuild.mjs` copies `dist/index.html` to `dist/404.html` for static hosts; `_redirects`/`vercel.json`/`netlify.toml` add SPA fallbacks. |
| 16 | Broken links | Done | `scripts/check-links.mjs` verifies every internal `to`/`href`/`navigate` against routes and every built asset in `dist/index.html`. Run `npm run check:links`. |
| 17 | Form validation | Done | Zod schemas in `src/utils/validation.ts` for sign-in, registration, profile, card, UPI and payments. Inline field errors and accessible hints. |
| 18 | Spam / bot protection | Done | `src/components/security/Honeypot.tsx` hidden field on sign-in and registration, plus `src/utils/abuse.ts` rate limits. Client-side only — a production app also needs server-side checks. |
| 19 | Analytics | Done | `src/utils/analytics.ts` + `src/pages/admin/Analytics.tsx`. Consent-gated, local-first, max 250 events, no PII, optional first-party endpoint via `VITE_ANALYTICS_ENDPOINT`. |
| 20 | One clear CTA | Done | Landing page has one primary **Open the demo** CTA; secondary links are quiet text/outline actions. Signed-in users go straight to their role home. |

---

## Verification commands

```bash
npm run build          # type-check, bundle, copy dist/404.html
npm run check          # contrast + internal links
npm run check:mobile   # 390px/320px overflow, menu, footer and contact links
npm run lint           # warnings only, no errors
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1   # 28 routes
```

## Before a real public launch

1. Replace `https://parksure.example` in `index.html`, `public/robots.txt`,
   `public/sitemap.xml` and `public/.well-known/security.txt` with the real
   HTTPS domain.
2. Replace `'unsafe-inline'` in the CSP `style-src` with nonces or hashes.
   Scripts are already locked to `'self'`.
3. Move any real payment, OTP, SMS, database or signing secret to a server.
4. Add server-side rate limiting, bot detection and audit persistence; the demo’s
   protection is client-side only.
5. Serve the `_headers` file (Netlify) or `vercel.json` (Vercel) so HSTS, CSP and
   frame protection are actually sent.
6. Configure `VITE_ANALYTICS_ENDPOINT` only if you want first-party collection.
