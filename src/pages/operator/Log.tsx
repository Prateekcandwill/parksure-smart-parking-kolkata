import { useMemo, useState } from 'react'
import { CreditCard, Download, ScanLine, ScrollText, ShieldCheck } from 'lucide-react'
import { useDB } from '@/api/useDB'
import { getGateEvents } from '@/api/gate'
import { paymentMethodNames } from '@/api/payments'
import { useActivePlace } from '@/hooks/useActivePlace'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceSwitcher } from '@/components/layout/PlaceSwitcher'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format'
import { downloadCsv } from '@/utils/csv'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'

type LogTab = 'gate' | 'payments' | 'audit'

export default function LogPage() {
  const db = useDB()
  const place = useActivePlace()
  const [tab, setTab] = useState<LogTab>('gate')

  const gateEvents = useMemo(() => (place ? getGateEvents(place.id) : []), [db.gateEvents, place])

  const paymentIds = useMemo(() => {
    if (!place) return new Set<string>()
    const reservationPayments = db.reservations
      .filter((reservation) => reservation.placeId === place.id)
      .map((reservation) => reservation.paymentId)
    const shiftIds = new Set(
      db.shifts.filter((shift) => shift.placeId === place.id).map((shift) => shift.id),
    )
    const cashPayments = db.payments
      .filter((payment) => payment.shiftId && shiftIds.has(payment.shiftId))
      .map((payment) => payment.id)
    return new Set([...reservationPayments, ...cashPayments])
  }, [db.payments, db.reservations, db.shifts, place])

  const payments = useMemo(
    () =>
      db.payments
        .filter((payment) => paymentIds.has(payment.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [db.payments, paymentIds],
  )

  const auditEvents = useMemo(
    () =>
      place
        ? db.auditEvents
            .filter(
              (event) =>
                event.target.includes(place.id) ||
                event.target.includes(place.name) ||
                event.action.toLowerCase().includes('gate') ||
                event.action.toLowerCase().includes('cash'),
            )
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        : [],
    [db.auditEvents, place],
  )

  if (!place) return null

  const exportGate = () => {
    downloadCsv(
      `parksure-gate-${place.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['event_id', 'at', 'direction', 'plate_read', 'plate_expected', 'confidence', 'status', 'payment_due', 'prebooked', 'attendant_id', 'note'],
      gateEvents.map((event) => [
        event.id,
        formatDateTime(event.at),
        event.direction,
        event.plateRead,
        event.plateExpected ?? '',
        event.confidence,
        event.status,
        event.paymentDue ?? 0,
        event.prebooked ? 'yes' : 'no',
        event.attendantId ?? '',
        event.note ?? '',
      ]),
    )
    haptic('success')
    toast({ tone: 'success', title: 'Gate log exported', message: `${gateEvents.length} rows` })
  }

  const exportPayments = () => {
    downloadCsv(
      `parksure-payments-${place.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['payment_id', 'reference', 'created_at', 'method', 'status', 'kind', 'context', 'amount', 'user_id', 'shift_id'],
      payments.map((payment) => [
        payment.id,
        payment.reference,
        formatDateTime(payment.createdAt),
        paymentMethodNames[payment.method],
        payment.status,
        payment.kind,
        payment.context,
        payment.amount,
        payment.userId,
        payment.shiftId ?? '',
      ]),
    )
    haptic('success')
    toast({ tone: 'success', title: 'Payment log exported', message: `${payments.length} rows` })
  }

  const exportAudit = () => {
    downloadCsv(
      `parksure-audit-${place.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['event_id', 'at', 'actor_id', 'actor_name', 'actor_role', 'action', 'target', 'reason', 'prev_hash', 'hash'],
      auditEvents.map((event) => [
        event.id,
        formatDateTime(event.at),
        event.actorId,
        event.actorName,
        event.actorRole,
        event.action,
        event.target,
        event.reason ?? '',
        event.prevHash,
        event.hash,
      ]),
    )
    haptic('success')
    toast({ tone: 'success', title: 'Audit slice exported', message: `${auditEvents.length} rows` })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Log"
        title="Event trail"
        description="Gate, payment and audit records for this place, exportable as CSV."
        action={<PlaceSwitcher />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge />
        <StatusBadge tone="neutral" label={`${gateEvents.length} gate · ${payments.length} payments`} />
      </div>

      <SegmentedControl
        ariaLabel="Choose log type"
        value={tab}
        onChange={(value) => {
          haptic('tap')
          setTab(value)
        }}
        options={[
          { value: 'gate', label: 'Gate', icon: <ScanLine className="h-3.5 w-3.5" /> },
          { value: 'payments', label: 'Payments', icon: <CreditCard className="h-3.5 w-3.5" /> },
          { value: 'audit', label: 'Audit', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
        ]}
      />

      {tab === 'gate' ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Gate events</h3>
            </div>
            <Button size="sm" variant="secondary" iconLeft={<Download className="h-4 w-4" />} onClick={exportGate}>
              CSV
            </Button>
          </div>
          {gateEvents.length === 0 ? (
            <EmptyState
              icon={<ScanLine className="h-6 w-6" aria-hidden="true" />}
              title="No gate events"
              body="ANPR reads and manual entries appear here."
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {gateEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold text-text">{event.plateRead}</div>
                    <div className="mt-0.5 truncate text-[10px] text-muted">
                      {titleCase(event.direction)} · {formatDateTime(event.at)}
                      {event.paymentDue ? ` · ${formatCurrency(event.paymentDue)}` : ''}
                    </div>
                  </div>
                  <StatusBadge
                    tone={
                      event.status === 'cleared'
                        ? 'success'
                        : event.status === 'refused'
                          ? 'danger'
                          : event.status === 'manual'
                            ? 'info'
                            : 'pending'
                    }
                    label={event.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === 'payments' ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Payments</h3>
            </div>
            <Button size="sm" variant="secondary" iconLeft={<Download className="h-4 w-4" />} onClick={exportPayments}>
              CSV
            </Button>
          </div>
          {payments.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-6 w-6" aria-hidden="true" />}
              title="No payments yet"
              body="Bookings and cash collections at this place appear here."
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-text">{payment.reference}</span>
                      <span className="text-[10px] text-muted">{paymentMethodNames[payment.method]}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-muted">
                      {titleCase(payment.context)} · {formatDateTime(payment.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold text-text">{formatCurrency(payment.amount)}</div>
                    <StatusBadge
                      tone={
                        payment.status === 'success'
                          ? 'success'
                          : payment.status === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                      label={payment.status}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === 'audit' ? (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-text">Audit slice</h3>
            </div>
            <Button size="sm" variant="secondary" iconLeft={<Download className="h-4 w-4" />} onClick={exportAudit}>
              CSV
            </Button>
          </div>
          {auditEvents.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
              title="No matching audit events"
              body="Actions linked to this place will appear here."
            />
          ) : (
            <ul className="divide-y divide-line/60">
              {auditEvents.map((event) => (
                <li key={event.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-text">{event.action}</span>
                    <span className="shrink-0 text-[10px] text-muted">{formatDateTime(event.at)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted">
                    {event.actorName} · {event.target}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  )
}
