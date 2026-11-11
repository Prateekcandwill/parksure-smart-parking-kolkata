/**
 * Central place for build-time configuration.
 *
 * The values below are demo defaults so the prototype runs with no setup.
 * They are intentionally public demo credentials, not production secrets.
 * Anything genuinely sensitive (gateway keys, OTP delivery, database
 * passwords) must live on a server and never be shipped to the browser.
 *
 * Override any value with a Vite environment variable, for example:
 *   VITE_DEMO_OTP=654321
 *   VITE_SUPPORT_EMAIL=help@example.com
 *   VITE_SITE_URL=https://parksure.example
 *
 * See `.env.example` for the full list.
 */

type EnvKey =
  | 'VITE_DEMO_OTP'
  | 'VITE_DEMO_PASSWORD'
  | 'VITE_DEMO_3DS_CODE'
  | 'VITE_SUPPORT_EMAIL'
  | 'VITE_SUPPORT_PHONE'
  | 'VITE_SUPPORT_PHONE_DISPLAY'
  | 'VITE_SITE_URL'
  | 'VITE_ANALYTICS_ENDPOINT'

function readEnv(key: EnvKey, fallback: string): string {
  const raw = import.meta.env[key]
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : fallback
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

export const DEMO_CONFIG = {
  /** Demo OTP for sign-in and the simulated 3-D Secure step. */
  otp: readEnv('VITE_DEMO_OTP', '123456'),
  /** Demo password for every seeded account. */
  password: readEnv('VITE_DEMO_PASSWORD', 'demo1234'),
  /** Demo 3-D Secure code used by card payments. */
  secureCode: readEnv('VITE_DEMO_3DS_CODE', '123456'),
  /** Human support inbox shown in the legal pages and assistant. */
  supportEmail: readEnv('VITE_SUPPORT_EMAIL', 'support@parksure.demo'),
  /** Support phone in tel: form. Public demo number, not a live helpline. */
  supportPhone: readEnv('VITE_SUPPORT_PHONE', '+913340001234'),
  /** Human-readable support phone shown next to the tel: link. */
  supportPhoneDisplay: readEnv('VITE_SUPPORT_PHONE_DISPLAY', '+91 33 4000 1234'),
  /** Canonical origin used for SEO tags, sitemap links and sharing. */
  siteUrl: normalizeSiteUrl(readEnv('VITE_SITE_URL', 'https://parksure.example')),
  /** Optional first-party analytics collector. Empty means local-only analytics. */
  analyticsEndpoint: readEnv('VITE_ANALYTICS_ENDPOINT', ''),
} as const

export const IS_PRODUCTION = import.meta.env.PROD
