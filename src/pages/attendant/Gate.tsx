import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Keyboard,
  PhoneCall,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import type { GateDirection, GateEvent } from '@/types'
import { useDB } from '@/api/useDB'
import {
  callOperator,
  confirmGateEvent,
  getGateEvents,
  getOpenShift,
  getPendingGateEvents,
  manualGateEntry,
  refuseGateEvent,
  settleGateEventOnline,
} from '@/api/gate'
import { useActivePlace } from '@/hooks/useActivePlace'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceSwitcher } from '@/components/layout/PlaceSwitcher'
import { CashCollectionSheet } from '@/components/payments/CashCollectionSheet'
import { PaymentSheet } from '@/components/payments/PaymentSheet'
import { StatTile } from '@/components/common/StatTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { normalizePlate, plateDiff } from '@/utils/plates'
import { plateSchema } from '@/utils/validation'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'
import { cn } from '@/utils/cn'

function PlateRead({ read, expected }: { read: string; expected?: string }) {
  if (!expected || normalizePlate(read) === normalizePlate(expected)) {
    return <span className="font-mono text-2xl font-semibold tracking-tight text-text">{read}</span>
  }
  const diff = plateDiff(read, expected)
  return (
    <span className="font-mono text-2xl font-semibold tracking-tight text-text">
      {read.split('').map((character, index) =>
        diff.readIndices.has(index) ? (
          <mark
            key={`${character}-${index}`}
            className="rounded-[4px] bg-danger/20 px-0.5 text-danger"
            title="ANPR read differs from the expected plate"
          >
            {character}
          </mark>
        ) : (
          <span key={`${character}-${index}`}>{character}</span>
        ),
      )}
    </span>
  )
}

export default function GatePage() {
  const db = useDB()
  const user = useCurrentUser()
  const place = useActivePlace()
  const [cashEvent, setCashEvent] = useState<GateEvent | null>(null)
  const [onlineEvent, setOnlineEvent] = useState<GateEvent | null>(null)
  const [refuseEvent, setRefuseEvent] = useState<GateEvent | null>(null)
  const [refuseReason, setRefuseReason] = useState('')
  const [callEvent, setCallEvent] = useState<GateEvent | null>(null)
  const [callNote, setCallNote] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualPlate, setManualPlate] = useState('')
  const [manualDirection, setManualDirection] = useState<GateDirection>('entry')
  const [manualError, setManualError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const pending = useMemo(
    () => (place ? getPendingGateEvents(place.id) : []),
    [db.gateEvents, place],
  )
  const recent = useMemo(
    () => (place ? getGateEvents(place.id).filter((event) => event.status !== 'pending').slice(0, 8) : []),
    [db.gateEvents, place],
  )
  const shift = user && place ? getOpenShift(user.id, place.id) : undefined

  const payerFor = (event: GateEvent | null): string => {
    if (!event) return 'u_driver'
    const reservation = db.reservations.find(
      (candidate) =>
        candidate.id === event.reservationId ||
        (candidate.plate === event.plateRead &&
          (candidate.status === 'active' || candidate.status === 'upcoming')),
    )
    return reservation?.userId ?? db.users.find((candidate) => candidate.id === 'u_driver')?.id ?? 'u_driver'
  }

  if (!user || !place) return null

  const confirm = async (event: GateEvent) => {
    setBusyId(event.id)
    try {
      const result = await confirmGateEvent({ eventId: event.id, attendant: user })
      if (!result.barrierOpened) {
        haptic('warning')
        if (event.prebooked) {
          setOnlineEvent(event)
          toast({
            tone: 'info',
            title: 'Pre-booked · online payment only',
            message: 'Cash cannot clear this slot. Use the online sheet to settle the balance.',
          })
        } else {
          setCashEvent(event)
          toast({ tone: 'info', title: 'Payment due', message: 'Collect cash or ask the driver to pay online.' })
        }
      } else {
        haptic('success')
        toast({
          tone: 'success',
          title: 'Barrier opened',
          message: `${event.plateRead} · ${event.direction === 'entry' ? 'entry' : 'exit'} cleared`,
        })
      }
    } catch (caught) {
      haptic('error')
      toast({
        tone: 'error',
        title: 'Could not clear the gate',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setBusyId(null)
    }
  }

  const submitRefuse = async () => {
    if (!refuseEvent) return
    if (refuseReason.trim().length < 3) {
      toast({ tone: 'warning', title: 'Add a reason', message: 'At least 3 characters for the audit trail.' })
      return
    }
    setSubmitting(true)
    try {
      await refuseGateEvent({ eventId: refuseEvent.id, attendant: user, reason: refuseReason.trim() })
      haptic('warning')
      toast({ tone: 'info', title: 'Entry refused', message: refuseReason.trim() })
      setRefuseEvent(null)
      setRefuseReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not refuse the gate',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitCall = async () => {
    if (!callEvent) return
    if (callNote.trim().length < 3) {
      toast({ tone: 'warning', title: 'Add a note', message: 'Tell the operator what you need.' })
      return
    }
    setSubmitting(true)
    try {
      await callOperator({ eventId: callEvent.id, attendant: user, note: callNote.trim() })
      haptic('success')
      toast({ tone: 'success', title: 'Operator called', message: 'A ticket is now in the operator queue.' })
      setCallEvent(null)
      setCallNote('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not call the operator',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitManual = async () => {
    const parsed = plateSchema.safeParse(manualPlate)
    if (!parsed.success) {
      setManualError(parsed.error.issues[0]?.message ?? 'Enter a valid plate.')
      return
    }
    setSubmitting(true)
    setManualError(null)
    try {
      await manualGateEntry({
        placeId: place.id,
        plate: parsed.data,
        attendant: user,
        direction: manualDirection,
      })
      haptic('success')
      toast({
        tone: 'success',
        title: 'Manual entry recorded',
        message: `${parsed.data} · ${manualDirection}`,
      })
      setManualOpen(false)
      setManualPlate('')
    } catch (caught) {
      setManualError(caught instanceof Error ? caught.message : 'Could not record the entry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Gate"
        title="One decision at a time"
        description="Confirm the plate, collect what is due, and keep the barrier moving."
        action={<PlaceSwitcher />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge live />
        <StatusBadge tone={pending.length > 0 ? 'warning' : 'success'} label={`${pending.length} in queue`} />
        <StatusBadge tone={shift ? 'success' : 'neutral'} label={shift ? 'Shift open' : 'No cash shift'} />
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <StatTile
          label="Cash collected"
          value={formatCurrency(shift?.cashCollected ?? 0)}
          icon={<Banknote className="h-4 w-4" />}
          tone="accent"
        />
        <StatTile
          label="Cash txns"
          value={String(shift?.transactions ?? 0)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <StatTile
          label="Opening float"
          value={formatCurrency(shift?.openingFloat ?? 0)}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="info"
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="label-caps">Gate controls</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              Manual entry records a cleared event and starts a session. Cash starts a shift automatically.
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            iconLeft={<Keyboard className="h-4 w-4" />}
            onClick={() => {
              haptic('tap')
              setManualOpen(true)
            }}
          >
            Manual entry
          </Button>
        </div>
      </Card>

      <section aria-labelledby="gate-queue-title" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="gate-queue-title" className="font-display text-lg font-semibold text-text">
            Gate queue
          </h2>
          <span className="text-[11px] text-muted">Live · simulated</span>
        </div>

        {pending.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ScanLine className="h-6 w-6" aria-hidden="true" />}
              title="Queue is clear"
              body="No vehicle is waiting at the barrier. New ANPR reads appear here automatically."
            />
          </Card>
        ) : (
          pending.map((event) => {
            const mismatch = Boolean(
              event.plateExpected && normalizePlate(event.plateRead) !== normalizePlate(event.plateExpected),
            )
            const due = event.paymentDue ?? 0
            const isBusy = busyId === event.id
            return (
              <Card
                key={event.id}
                strong={mismatch}
                className={cn('overflow-hidden p-4', mismatch && 'border-danger/40')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        tone={event.direction === 'entry' ? 'info' : 'pending'}
                        label={event.direction === 'entry' ? 'Entry' : 'Exit'}
                      />
                      {mismatch ? <StatusBadge tone="danger" label="Plate mismatch" /> : null}
                      {event.prebooked ? <StatusBadge tone="warning" label="Pre-booked" /> : null}
                      {due > 0 ? <StatusBadge tone="danger" label={`${formatCurrency(due)} due`} /> : null}
                    </div>
                    <div className="mt-3">
                      <PlateRead read={event.plateRead} expected={event.plateExpected} />
                      {event.plateExpected ? (
                        <div className="mt-1 text-[11px] text-muted">
                          Expected{' '}
                          <span className="font-mono text-text/80">{event.plateExpected}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" aria-hidden="true" />
                        {formatDateTime(event.at)}
                      </span>
                      <span>{event.confidence}% ANPR confidence</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                      event.direction === 'entry'
                        ? 'border-info/25 bg-info/10 text-info'
                        : 'border-warning/30 bg-warning/10 text-warning',
                    )}
                  >
                    {event.direction === 'entry' ? (
                      <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                </div>

                {mismatch ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/8 p-3 text-[11px] leading-relaxed text-danger">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    ANPR read does not match the expected plate. Check the vehicle before confirming.
                  </div>
                ) : null}

                {event.prebooked && due > 0 ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/8 p-3 text-[11px] leading-relaxed text-warning">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Cash is not accepted for pre-booked slots. Settle the overstay online before opening the barrier.
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    size="glove"
                    loading={isBusy}
                    iconLeft={<CheckCircle2 className="h-5 w-5" />}
                    onClick={() => void confirm(event)}
                  >
                    {due > 0 ? (event.prebooked ? 'Online pay' : 'Confirm') : 'Confirm'}
                  </Button>
                  <Button
                    size="glove"
                    variant="danger"
                    iconLeft={<XCircle className="h-5 w-5" />}
                    onClick={() => {
                      haptic('tap')
                      setRefuseEvent(event)
                      setRefuseReason('')
                    }}
                  >
                    Refuse
                  </Button>
                </div>
                <Button
                  size="lg"
                  variant="secondary"
                  className="mt-2 w-full"
                  iconLeft={<PhoneCall className="h-4 w-4" />}
                  onClick={() => {
                    haptic('tap')
                    setCallEvent(event)
                    setCallNote('')
                  }}
                >
                  Call operator
                </Button>
              </Card>
            )
          })
        )}
      </section>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">Recent gate events</h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-muted">Cleared and refused events appear here.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-xl border border-line/80 bg-raised/30 px-3 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line/80 bg-ink/40 text-muted">
                  {event.direction === 'entry' ? (
                    <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-semibold text-text">{event.plateRead}</div>
                  <div className="mt-0.5 truncate text-[10px] text-muted">
                    {event.note ?? 'No note'} · {formatDateTime(event.at)}
                  </div>
                </div>
                <StatusBadge
                  tone={event.status === 'cleared' ? 'success' : event.status === 'refused' ? 'danger' : 'info'}
                  label={event.status}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <CashCollectionSheet
        open={Boolean(cashEvent)}
        event={cashEvent}
        attendant={user}
        onClose={() => setCashEvent(null)}
        onSuccess={(result) => {
          toast({
            tone: 'success',
            title: 'Cash recorded',
            message: `${result.payment.reference} · change ${formatCurrency(result.change)}`,
          })
          setCashEvent(null)
        }}
      />

      <PaymentSheet
        open={Boolean(onlineEvent)}
        onClose={() => setOnlineEvent(null)}
        userId={payerFor(onlineEvent)}
        amount={onlineEvent?.paymentDue ?? 0}
        context="exit"
        title="Settle online exit"
        description="Pre-booked slots cannot be settled with cash. This runs a simulated online payment."
        plate={onlineEvent?.plateRead}
        placeName={place.name}
        receiptLabel={`Pre-booked overstay exit · ${place.name}`}
        allowedMethods={['upi', 'qr', 'card', 'debit', 'fastag']}
        onSuccess={async (result) => {
          if (!onlineEvent) return
          await settleGateEventOnline({ eventId: onlineEvent.id, attendant: user, paymentId: result.payment.id })
          setOnlineEvent(null)
          haptic('success')
          toast({
            tone: 'success',
            title: 'Barrier opened',
            message: `Online payment ${result.payment.reference} cleared`,
          })
        }}
      />

      <BottomSheet
        open={Boolean(refuseEvent)}
        onClose={() => setRefuseEvent(null)}
        title="Refuse this vehicle?"
        description="The refusal is written to the audit trail with your reason."
        footer={
          <Button variant="danger" size="lg" className="w-full" loading={submitting} onClick={() => void submitRefuse()}>
            Record refusal
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="rounded-2xl border border-line/80 bg-raised/40 p-3">
            <div className="label-caps">Plate</div>
            <div className="mt-1 font-mono text-lg font-semibold text-text">{refuseEvent?.plateRead}</div>
          </div>
          <TextField
            label="Reason"
            placeholder="Plate does not match the vehicle"
            value={refuseReason}
            onChange={(event) => setRefuseReason(event.target.value)}
            hint="At least 3 characters. This is visible to the operator."
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={Boolean(callEvent)}
        onClose={() => setCallEvent(null)}
        title="Call an operator"
        description="Creates a ticket in the operator alert queue."
        footer={
          <Button size="lg" className="w-full" loading={submitting} onClick={() => void submitCall()}>
            Send to operator
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div className="rounded-2xl border border-line/80 bg-raised/40 p-3">
            <div className="label-caps">Vehicle</div>
            <div className="mt-1 font-mono text-lg font-semibold text-text">{callEvent?.plateRead}</div>
          </div>
          <TextField
            label="What do you need?"
            placeholder="Vehicle blocking the exit barrier"
            value={callNote}
            onChange={(event) => setCallNote(event.target.value)}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={manualOpen}
        onClose={() => {
          setManualOpen(false)
          setManualError(null)
        }}
        title="Manual gate entry"
        description="Use when ANPR cannot read a plate. The action is audited."
        footer={
          <Button size="lg" className="w-full" loading={submitting} onClick={() => void submitManual()}>
            Record {manualDirection}
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <SegmentedControl
            ariaLabel="Gate direction"
            value={manualDirection}
            onChange={(value) => {
              haptic('tap')
              setManualDirection(value)
            }}
            options={[
              { value: 'entry', label: 'Entry' },
              { value: 'exit', label: 'Exit' },
            ]}
          />
          <TextField
            label="Vehicle plate"
            placeholder="WB 06 MN 4410"
            value={manualPlate}
            onChange={(event) => {
              setManualPlate(event.target.value.toUpperCase())
              setManualError(null)
            }}
            hint="Format: WB 06 MN 4410"
            error={manualError ?? undefined}
            autoComplete="off"
          />
          <div className="rounded-xl border border-line/80 bg-raised/40 p-3 text-[11px] leading-relaxed text-muted">
            A manual entry starts a parking session for this place. Use it only after checking the vehicle.
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
