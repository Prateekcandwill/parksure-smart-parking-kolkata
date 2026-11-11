import { DEMO_CONFIG } from '@/config/env'
import { hasAnalyticsConsent } from '@/store/consent'
import { uid } from '@/utils/id'

/**
 * First-party, privacy-friendly analytics.
 *
 * Nothing is collected until the visitor opts in through the consent banner.
 * Events stay in localStorage for the in-app Admin → Usage analytics view.
 * If VITE_ANALYTICS_ENDPOINT is set, a single JSON beacon is also sent to that
 * first-party endpoint — no third-party script, cookie or fingerprinting.
 */

const STORAGE_KEY = 'parksure.analytics.v1'
const MAX_EVENTS = 250

export interface AnalyticsEvent {
  id: string
  name: string
  path: string
  at: string
  props?: Record<string, string | number | boolean>
}

export interface AnalyticsSummary {
  total: number
  pageViews: number
  actions: number
  uniquePaths: number
  topPaths: Array<{ path: string; count: number }>
  topActions: Array<{ name: string; count: number }>
  last7Days: Array<{ day: string; count: number }>
  firstEventAt?: string
  lastEventAt?: string
}

function readEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as AnalyticsEvent[]
    return Array.isArray(parsed) ? parsed.filter((event) => event && event.name && event.at) : []
  } catch {
    return []
  }
}

function writeEvents(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
  } catch {
    // Analytics is best-effort in the demo.
  }
}

export function track(name: string, props?: Record<string, string | number | boolean>): void {
  if (!hasAnalyticsConsent()) return

  const event: AnalyticsEvent = {
    id: uid('event'),
    name,
    path: typeof window === 'undefined' ? '/' : window.location.pathname,
    at: new Date().toISOString(),
    props,
  }

  writeEvents([...readEvents(), event])

  if (DEMO_CONFIG.analyticsEndpoint) {
    try {
      void fetch(DEMO_CONFIG.analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {
        // The local copy is still available if the endpoint is offline.
      })
    } catch {
      // Ignore transport errors in the demo.
    }
  }
}

export function getAnalyticsEvents(): AnalyticsEvent[] {
  return readEvents()
}

export function clearAnalytics(): void {
  writeEvents([])
}

function countBy<T extends string>(values: T[]): Array<{ key: T; count: number }> {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = readEvents()
  const paths = countBy(events.map((event) => event.path))
  const names = countBy(events.map((event) => event.name))

  const days: Array<{ day: string; count: number }> = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    days.push({
      day: key,
      count: events.filter((event) => event.at.slice(0, 10) === key).length,
    })
  }

  return {
    total: events.length,
    pageViews: events.filter((event) => event.name === 'page_view').length,
    actions: events.filter((event) => event.name !== 'page_view').length,
    uniquePaths: paths.length,
    topPaths: paths.slice(0, 5).map(({ key, count }) => ({ path: key, count })),
    topActions: names
      .filter(({ key }) => key !== 'page_view')
      .slice(0, 5)
      .map(({ key, count }) => ({ name: key, count })),
    last7Days: days,
    firstEventAt: events[0]?.at,
    lastEventAt: events[events.length - 1]?.at,
  }
}
