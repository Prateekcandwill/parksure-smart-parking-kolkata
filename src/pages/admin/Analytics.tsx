import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, BarChart3, Cookie, Eye, MousePointerClick, Route, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SimulatedDataNote } from '@/components/ui/DemoBadge'
import { useConsentStore } from '@/store/consent'
import { toast } from '@/store/toast'
import { clearAnalytics, getAnalyticsEvents, getAnalyticsSummary } from '@/utils/analytics'
import { formatDateTime } from '@/utils/format'
import { haptic } from '@/utils/haptics'

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-text">{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-muted">{hint}</div> : null}
    </Card>
  )
}

export default function AdminAnalyticsPage() {
  const analytics = useConsentStore((state) => state.analytics)
  const setAnalytics = useConsentStore((state) => state.setAnalytics)
  const [, setVersion] = useState(0)

  // `version` is bumped after "Clear log"; reading on each render keeps the
  // dashboard in sync with the local store without a memo dependency warning.
  const summary = getAnalyticsSummary()
  const events = getAnalyticsEvents().slice(-12).reverse()
  const peak = Math.max(1, ...summary.last7Days.map((day) => day.count))

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Usage analytics"
        description="Privacy-first, local-only analytics. Nothing is collected until a visitor opts in, and the log never leaves this device unless a first-party endpoint is configured."
        action={<StatusBadge tone={analytics ? 'success' : 'info'} label={analytics ? 'Consent on' : 'Consent off'} />}
      />

      {!analytics ? (
        <Card className="border-accent/25 bg-accent/8 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
              <Cookie className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text">Analytics are off</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                The demo only records page views and action names after an explicit opt-in. Turn it on to populate this
                page, or use the consent banner. No advertising cookies or third-party trackers are involved.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  haptic('tap')
                  setAnalytics(true)
                }}
              >
                Enable local analytics
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Activity} label="Events" value={summary.total} hint="Last 250 kept" />
        <Stat icon={Eye} label="Page views" value={summary.pageViews} hint="Route visits" />
        <Stat icon={MousePointerClick} label="Actions" value={summary.actions} hint="Non-navigation events" />
        <Stat icon={Route} label="Routes" value={summary.uniquePaths} hint="Distinct paths seen" />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">Last seven days</h2>
        </div>
        <div className="flex h-36 items-end gap-2" role="img" aria-label="Event counts for the last seven days">
          {summary.last7Days.map((day) => (
            <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted">{day.count}</span>
              <div
                className="w-full rounded-t-lg border border-accent/25 bg-accent/25"
                style={{ height: `${Math.max(4, (day.count / peak) * 96)}px` }}
              />
              <span className="text-[9px] text-muted">{day.day.slice(5)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text">Top routes</h2>
          {summary.topPaths.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted">No page views recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {summary.topPaths.map((path) => (
                <li key={path.path} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate font-mono text-text">{path.path}</span>
                  <span className="shrink-0 rounded-full border border-line/80 bg-raised/60 px-2 py-0.5 font-semibold text-muted">
                    {path.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-text">Top actions</h2>
          {summary.topActions.length === 0 ? (
            <p className="mt-2 text-[11px] text-muted">No actions recorded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {summary.topActions.map((action) => (
                <li key={action.name} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate font-mono text-text">{action.name}</span>
                  <span className="shrink-0 rounded-full border border-line/80 bg-raised/60 px-2 py-0.5 font-semibold text-muted">
                    {action.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">Recent events</h2>
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Trash2 className="h-4 w-4" />}
            onClick={() => {
              clearAnalytics()
              setVersion((value) => value + 1)
              haptic('success')
              toast({ tone: 'success', title: 'Analytics cleared', message: 'The local event log is empty again.' })
            }}
          >
            Clear log
          </Button>
        </div>
        {events.length === 0 ? (
          <p className="text-[11px] text-muted">Nothing recorded yet. Browse a few routes with consent on.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line/80">
            <table className="w-full table-fixed border-collapse text-left text-[10px] sm:text-[11px]">
              <thead className="bg-raised/70 text-[9px] uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="w-[30%] px-2 py-2 font-semibold sm:px-3">Event</th>
                  <th className="w-[44%] px-2 py-2 font-semibold sm:px-3">Route</th>
                  <th className="w-[26%] px-2 py-2 font-semibold sm:px-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="break-anywhere px-2 py-2 font-mono text-text sm:px-3">{event.name}</td>
                    <td className="break-anywhere px-2 py-2 font-mono text-muted sm:px-3">{event.path}</td>
                    <td className="break-anywhere px-2 py-2 text-muted sm:px-3">{formatDateTime(event.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-muted">
          Events contain a name, route, timestamp and optional non-personal properties. Chat messages, payment details
          and precise location are never recorded. Read the{' '}
          <Link to="/privacy" className="font-semibold text-accent underline-offset-4 hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <SimulatedDataNote className="mt-3" />
      </Card>
    </div>
  )
}
