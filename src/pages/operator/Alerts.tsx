import { useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import type { Alert, AlertSeverity } from '@/types'
import { useDB } from '@/api/useDB'
import { acknowledgeAlert, assignAlert, getAlerts, resolveAlert } from '@/api/alerts'
import { useActivePlace } from '@/hooks/useActivePlace'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceSwitcher } from '@/components/layout/PlaceSwitcher'
import { StatTile } from '@/components/common/StatTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import { TextField } from '@/components/ui/Input'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatRelative, titleCase } from '@/utils/format'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'

type Filter = 'open' | 'all' | 'resolved'

const severityTone: Record<AlertSeverity, StatusTone> = {
  critical: 'danger',
  warning: 'warning',
  info: 'info',
}

export default function AlertsPage() {
  const db = useDB()
  const user = useCurrentUser()
  const place = useActivePlace()
  const [filter, setFilter] = useState<Filter>('open')
  const [resolveTarget, setResolveTarget] = useState<Alert | null>(null)
  const [resolveReason, setResolveReason] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const alerts = useMemo(() => (place ? getAlerts(place.id) : []), [db.alerts, place])
  const visible = alerts.filter((alert) => {
    if (filter === 'open') return alert.status !== 'resolved'
    if (filter === 'resolved') return alert.status === 'resolved'
    return true
  })

  const openCount = alerts.filter((alert) => alert.status !== 'resolved').length
  const criticalCount = alerts.filter(
    (alert) => alert.status !== 'resolved' && alert.severity === 'critical',
  ).length
  const acknowledgedCount = alerts.filter((alert) => alert.status === 'acknowledged').length

  if (!user || !place) return null

  const run = async (alert: Alert, action: 'ack' | 'assign') => {
    setBusyId(alert.id)
    try {
      if (action === 'ack') {
        await acknowledgeAlert(alert.id, user)
        haptic('success')
        toast({ tone: 'success', title: 'Alert acknowledged', message: alert.message })
      } else {
        await assignAlert(alert.id, user)
        haptic('success')
        toast({ tone: 'success', title: 'Assigned to you', message: alert.message })
      }
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not update the alert',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setBusyId(null)
    }
  }

  const submitResolve = async () => {
    if (!resolveTarget) return
    if (resolveReason.trim().length < 3) {
      toast({ tone: 'warning', title: 'Add a resolution note', message: 'At least 3 characters.' })
      return
    }
    setSubmitting(true)
    try {
      await resolveAlert(resolveTarget.id, user, resolveReason.trim())
      haptic('success')
      toast({ tone: 'success', title: 'Alert resolved', message: resolveReason.trim() })
      setResolveTarget(null)
      setResolveReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not resolve the alert',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Alerts"
        title="Exceptions queue"
        description="Acknowledge, own and resolve sensor, gate and payment issues."
        action={<PlaceSwitcher />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge live />
        <StatusBadge tone={criticalCount > 0 ? 'danger' : 'success'} label={`${criticalCount} critical`} />
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <StatTile label="Open" value={String(openCount)} tone="warning" icon={<Bell className="h-4 w-4" />} />
        <StatTile
          label="Critical"
          value={String(criticalCount)}
          tone="danger"
          icon={<TriangleAlert className="h-4 w-4" />}
        />
        <StatTile
          label="Acknowledged"
          value={String(acknowledgedCount)}
          tone="info"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </div>

      <SegmentedControl
        ariaLabel="Filter alerts"
        value={filter}
        onChange={(value) => {
          haptic('tap')
          setFilter(value)
        }}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'all', label: 'All' },
          { value: 'resolved', label: 'Resolved' },
        ]}
      />

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
            title="Nothing needs attention"
            body="New sensor, gate and payment alerts appear here as the simulation runs."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((alert) => {
            const bay = alert.bayId ? db.bays.find((candidate) => candidate.id === alert.bayId) : undefined
            const assignee = alert.assignedTo
              ? db.users.find((candidate) => candidate.id === alert.assignedTo)
              : undefined
            const isBusy = busyId === alert.id
            return (
              <li key={alert.id}>
                <Card
                  className={
                    alert.status === 'resolved'
                      ? 'border-line/60 p-4 opacity-75'
                      : alert.severity === 'critical'
                        ? 'border-danger/30 p-4'
                        : 'p-4'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={
                          alert.severity === 'critical'
                            ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger'
                            : alert.severity === 'warning'
                              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warning/30 bg-warning/10 text-warning'
                              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-info/30 bg-info/10 text-info'
                        }
                      >
                        <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone={severityTone[alert.severity]} label={alert.severity} />
                          <StatusBadge
                            tone={
                              alert.status === 'resolved'
                                ? 'success'
                                : alert.status === 'acknowledged'
                                  ? 'info'
                                  : 'pending'
                            }
                            label={alert.status}
                          />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                            {titleCase(alert.type)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-text/90">{alert.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" aria-hidden="true" />
                            {formatRelative(alert.createdAt)}
                          </span>
                          {bay ? <span className="font-mono">Bay {bay.label}</span> : null}
                          {assignee ? <span>Owner: {assignee.name}</span> : <span>Unassigned</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {alert.status !== 'resolved' ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={alert.status !== 'open' || isBusy}
                        iconLeft={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => void run(alert, 'ack')}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isBusy || alert.assignedTo === user.id}
                        iconLeft={<UserPlus className="h-4 w-4" />}
                        onClick={() => void run(alert, 'assign')}
                      >
                        Assign to me
                      </Button>
                      <Button
                        size="sm"
                        iconLeft={<ShieldCheck className="h-4 w-4" />}
                        onClick={() => {
                          haptic('tap')
                          setResolveTarget(alert)
                          setResolveReason('')
                        }}
                      >
                        Resolve
                      </Button>
                    </div>
                  ) : null}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <BottomSheet
        open={Boolean(resolveTarget)}
        onClose={() => setResolveTarget(null)}
        title="Resolve this alert"
        description="The resolution note is written to the audit trail."
        footer={
          <Button size="lg" className="w-full" loading={submitting} onClick={() => void submitResolve()}>
            Mark resolved
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="rounded-2xl border border-line/80 bg-raised/40 p-3 text-xs leading-relaxed text-text/85">
            {resolveTarget?.message}
          </div>
          <TextField
            label="Resolution note"
            placeholder="Sensor replaced and confidence restored"
            value={resolveReason}
            onChange={(event) => setResolveReason(event.target.value)}
          />
        </div>
      </BottomSheet>
    </div>
  )
}
