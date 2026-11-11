import { Capacitor } from '@capacitor/core'
import { IS_PRODUCTION } from '@/config/env'

/**
 * Client-side security helpers.
 *
 * HTTPS enforcement, HSTS, CSP and frame protection belong on the server.
 * These helpers cover the parts a single-page app can enforce itself, and the
 * deployment files in `public/_headers`, `vercel.json` and `netlify.toml`
 * carry the response headers for real hosting.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])

function isPrivateHost(hostname: string): boolean {
  return (
    LOCAL_HOSTS.has(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname.endsWith('.local')
  )
}

/**
 * Redirects a production web visit from HTTP to HTTPS. Local development and
 * private-network previews are left alone, and native builds never redirect.
 */
export function enforceHttps(): void {
  if (typeof window === 'undefined') return
  if (Capacitor.isNativePlatform()) return
  if (!IS_PRODUCTION) return
  if (window.location.protocol !== 'http:') return
  if (isPrivateHost(window.location.hostname)) return

  const target = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`
  window.location.replace(target)
}

/**
 * Adds `rel="noopener noreferrer"` to external links that open in a new tab.
 * This prevents tab-nabbing and stops the target page from seeing a referrer.
 * Internal navigation and in-app `openExternal` calls are untouched.
 */
export function hardenExternalLinks(): () => void {
  if (typeof document === 'undefined') return () => undefined

  const handler = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const anchor = target.closest('a')
    if (!(anchor instanceof HTMLAnchorElement)) return
    const href = anchor.getAttribute('href') ?? ''
    if (!/^https?:\/\//i.test(href)) return
    try {
      const url = new URL(href, window.location.href)
      if (url.origin === window.location.origin) return
      anchor.setAttribute('rel', 'noopener noreferrer')
      anchor.setAttribute('target', '_blank')
    } catch {
      // Ignore malformed links.
    }
  }

  document.addEventListener('click', handler, true)
  return () => document.removeEventListener('click', handler, true)
}

/** Installs the client-side guards. Safe to call once at startup. */
export function installSecurity(): void {
  enforceHttps()
  hardenExternalLinks()
}
