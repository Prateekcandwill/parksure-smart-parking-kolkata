import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  MapPin,
  Navigation,
  Plus,
  ReceiptText,
  Timer,
} from 'lucide-react'
import type { Receipt, Reservation } from '@/types'
import { useDB } from '@/api/useDB'
import { getPlace } from '@/api/places'
import {
  cancelReservation,
  completeExit,
  extendReservation,
  getActiveReservation,
  getUpcomingReservations,
  getUserReservations,
  payAndExit,
  refundPolicy,
} from '@/api/bookings'
import { getReceiptForPayment, refundPayment } from '@/api/payments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceMap } from '@/components/map/PlaceMap'
import { PaymentSheet } from '@/components/payments/PaymentSheet'
import { ReceiptSheet } from '@/components/payments/ReceiptSheet'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextAreaField } from '@/components/ui/Input'
import { TiltCard } from '@/components/ui/TiltCard'
import { toast } from '@/store/toast'
import { haptic } from '@/utils/haptics'
import { openExternal, osmDirectionsUrl } from '@/utils/navigation'
import {
  formatCurrency,
  formatDateTime,
  formatTimer,
  minutesBetween,
  priceBreakdown,
} from '@/utils/format'

type PaymentIntent = { mode: 'extend'; minutes: number; amount: number } | { mode: 'exit'; amount: number }

function statusTone(status: Reservation['status']) {
  if (status === 'active') return 'success' as const
  if (status === 'upcoming') return 'info' as const
  if (status === 'completed') return 'neutral' as const
  return 'danger' as const
}

export default function TripPage() {
  const db = useDB()
  const user = useCurrentUser()
  const [now, setNow] = useState(() => Date.now())
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [cancelReason, setCancelReason] = useState('Change of plans')
  const [cancelling, setCancelling] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const active = user ? getActiveReservation(user.id) : undefined
  const upcoming = user ? getUpcomingReservations(user.id) : []
  const history = useMemo(
    () =>
      user
        ? getUserReservations(user.id).filter(
            (reservation) => reservation.status === 'completed' || reservation.status === 'cancelled',
          )
        : [],
    [db, user],
  )
  const place = active ? getPlace(active.placeId) : undefined

  if (!user) return null

  const remainingSeconds = active
    ? Math.floor((new Date(active.endAt).getTime() - now) / 1000)
    : 0
  const overstayMinutes = active ? minutesBetween(active.endAt, new Date(now)) : 0
  const exitBreakdown =
    place && overstayMinutes > 0 ? priceBreakdown(place.pricePerHour, overstayMinutes) : null
  const durationMinutes = active
    ? Math.max(1, minutesBetween(active.startAt, active.endAt))
    : 1
  const elapsedPercent = active
    ? Math.min(100, Math.max(0, 100 - (Math.max(0, remainingSeconds) / (durationMinutes * 60)) * 100))
    : 0

  const openReceipt = (paymentId: string) => {
    const found = getReceiptForPayment(paymentId)
    if (!found) {
      toast({ tone: 'info', title: 'No receipt for this entry', message: 'The payment did not produce an invoice.' })
      return
    }
    setReceipt(found)
    setReceiptOpen(true)
  }

  const startExtend = (minutes: number) => {
    if (!place) return
    haptic('tap')
    setPaymentIntent({ mode: 'extend', minutes, amount: priceBreakdown(place.pricePerHour, minutes).total })
  }

  const startExit = () => {
    if (!active) return
    if (!exitBreakdown) {
      void handleNoBalanceExit()
      return
    }
    haptic('tap')
    setPaymentIntent({ mode: 'exit', amount: exitBreakdown.total })
  }

  const handleNoBalanceExit = async () => {
    if (!active) return
    try {
      await completeExit({ reservationId: active.id, actorId: user.id, actorName: user.name })
      haptic('success')
      toast({
        tone: 'success',
        title: 'Exit cleared',
        message: 'Your prepaid time covered the session. The barrier will open at the gate.',
      })
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Exit could not be completed',
        message: caught instanceof Error ? caught.message : 'Try again or call an attendant.',
      })
    }
  }

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!active || !paymentIntent) return
    try {
      if (paymentIntent.mode === 'extend') {
        await extendReservation({
          reservationId: active.id,
          minutes: paymentIntent.minutes,
          paymentId,
          actorId: user.id,
          actorName: user.name,
        })
        haptic('success')
        toast({
          tone: 'success',
          title: 'Session extended',
          message: `Added ${paymentIntent.minutes} minutes to your parking pass.`,
        })
      } else {
        await payAndExit({
          reservationId: active.id,
          paymentId,
          actorId: user.id,
          actorName: user.name,
        })
        haptic('success')
        toast({
          tone: 'success',
          title: 'Paid and exited',
          message: 'The barrier will open as you approach the exit.',
        })
      }
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not update the session',
        message: caught instanceof Error ? caught.message : 'Try again or call an attendant.',
      })
    } finally {
      setPaymentIntent(null)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelling(true)
    const policy = refundPolicy(cancelTarget.startAt)
    try {
      await cancelReservation({
        reservationId: cancelTarget.id,
        actorId: user.id,
        actorName: user.name,
        actorRole: 'driver',
        reason: cancelReason.trim() || 'Driver cancelled the booking',
      })
      if (policy.percent > 0) {
        try {
          await refundPayment({
            originalPaymentId: cancelTarget.paymentId,
            percent: policy.percent,
            actorId: user.id,
            actorName: user.name,
            actorRole: 'driver',
            reason: `Cancellation refund · ${policy.percent}%`,
          })
        } catch {
          // The cancellation still stands even if the simulated refund cannot be repeated.
        }
      }
      haptic('success')
      toast({
        tone: 'success',
        title: 'Booking cancelled',
        message:
          policy.percent > 0
            ? `A ${policy.percent}% refund was issued to the original method.`
            : 'No automatic refund applies after the start time.',
      })
      setCancelTarget(null)
    } catch (caught) {
      haptic('error')
      toast({
        tone: 'error',
        title: 'Could not cancel',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setCancelling(false)
    }
  }

  const isEmpty = !active && upcoming.length === 0 && history.length === 0

  return (
    <div>
      <PageHeader
        eyebrow="Driver · Trip"
        title={active ? 'Your live parking pass' : 'Your trips'}
        description={
          active
            ? 'Keep this pass visible until you exit. Extend or pay for an overstay from here.'
            : 'Active passes, upcoming reservations and completed parking all live here.'
        }
        action={active ? <StatusBadge tone="success" label="Active" /> : undefined}
      />

      {isEmpty ? (
        <Card>
          <EmptyState
            icon={<Clock3 className="h-6 w-6" aria-hidden="true" />}
            title="No parking yet"
            body="Find a place and your live pass, timer and cost will appear here."
            action={
              <Link to="/driver/find" className={buttonClasses('primary', 'lg', 'w-full')}>
                Find parking
              </Link>
            }
          />
        </Card>
      ) : null}

      {active && place ? (
        <div className="space-y-4">
          <TiltCard className="[&>div]:rounded-[28px]">
            <div className="surface-card-strong relative overflow-hidden rounded-[28px] p-5">
              <div
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="label-caps">Parking pass</div>
                    <div className="mt-1 font-display text-lg font-semibold text-text">{place.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {place.address}
                    </div>
                  </div>
                  <StatusBadge tone={overstayMinutes > 0 ? 'warning' : 'success'} label={overstayMinutes > 0 ? 'Overstay' : 'Active'} />
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <div className="font-mono text-[1.7rem] font-semibold leading-none tracking-tight text-text">
                      {active.plate}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                      <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 font-mono font-semibold text-accent">
                        Bay {active.bayId ? active.bayId.split('_').pop() : '—'}
                      </span>
                      <span>
                        Level {active.level} · Row {active.row}
                      </span>
                    </div>
                  </div>
                  <ProgressRing value={elapsedPercent} label={`${Math.round(elapsedPercent)}% of parking time used`} />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-line/70 bg-ink/25 p-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted">
                      <Timer className="h-3 w-3" aria-hidden="true" />
                      {remainingSeconds >= 0 ? 'Time remaining' : 'Overstay'}
                    </div>
                    <div
                      className={`mt-1 font-mono text-xl font-semibold ${remainingSeconds < 0 ? 'text-danger' : 'text-text'}`}
                    >
                      {formatTimer(Math.abs(remainingSeconds))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Paid so far</div>
                    <div className="mt-1 font-mono text-xl font-semibold text-accent">
                      {formatCurrency(active.amount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Started</div>
                    <div className="mt-1 text-[11px] font-semibold text-text">{formatDateTime(active.startAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted">Ends</div>
                    <div className="mt-1 text-[11px] font-semibold text-text">{formatDateTime(active.endAt)}</div>
                  </div>
                </div>

                {exitBreakdown ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/8 px-3 py-2.5 text-[11px] leading-relaxed text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Overstay of {overstayMinutes} minutes. Exit balance {formatCurrency(exitBreakdown.total)}.
                    </span>
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="lg"
                    iconLeft={<Plus className="h-4 w-4" />}
                    onClick={() => startExtend(30)}
                  >
                    +30 min
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    iconLeft={<Plus className="h-4 w-4" />}
                    onClick={() => startExtend(60)}
                  >
                    +1 hour
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="mt-2 w-full"
                  iconLeft={<CreditCard className="h-4 w-4" />}
                  onClick={startExit}
                >
                  {exitBreakdown ? `Pay ${formatCurrency(exitBreakdown.total)} and exit` : 'End parking · no balance due'}
                </Button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    iconLeft={<ReceiptText className="h-4 w-4" />}
                    onClick={() => openReceipt(active.paymentId)}
                  >
                    Receipt
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setCancelReason('Change of plans')
                      setCancelTarget(active)
                    }}
                  >
                    Cancel booking
                  </Button>
                </div>
              </div>
            </div>
          </TiltCard>

          <Card className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-caps">Navigate to your bay</div>
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {place.address}
                </p>
              </div>
              <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-accent">
                {place.lat.toFixed(3)}, {place.lng.toFixed(3)}
              </span>
            </div>
            <PlaceMap places={[place]} selectedId={place.id} heightClass="h-[220px]" />
            <Button
              size="md"
              className="w-full"
              iconLeft={<Navigation className="h-4 w-4" />}
              onClick={() => openExternal(osmDirectionsUrl(place))}
            >
              Open directions in OpenStreetMap
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              Prepaid time is covered. If you leave early, the unused portion is not refunded automatically. Extend
              before the timer ends to avoid an exit balance.
            </div>
          </Card>
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-text">Upcoming</h2>
            <span className="text-[11px] text-muted">{upcoming.length} pre-booked</span>
          </div>
          <div className="space-y-3">
            {upcoming.map((reservation) => {
              const reservedPlace = getPlace(reservation.placeId)
              const policy = refundPolicy(reservation.startAt)
              return (
                <Card key={reservation.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-semibold text-text">
                          {reservedPlace?.name ?? 'Reserved place'}
                        </h3>
                        <StatusBadge tone="info" label="Upcoming" />
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                        <CalendarClock className="h-3 w-3" aria-hidden="true" />
                        {formatDateTime(reservation.startAt)} → {formatDateTime(reservation.endAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-accent">
                        {formatCurrency(reservation.amount)}
                      </div>
                      <div className="text-[10px] text-muted">paid</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line/70 bg-raised/40 px-3 py-2 text-[11px]">
                    <span className="font-mono font-semibold text-text">{reservation.plate}</span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">
                      Level {reservation.level} · Row {reservation.row}
                    </span>
                    <StatusBadge className="ml-auto" tone="reserved" label="Bay held" />
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted">{policy.label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="md"
                      iconLeft={<ReceiptText className="h-4 w-4" />}
                      onClick={() => openReceipt(reservation.paymentId)}
                    >
                      Receipt
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => {
                        setCancelReason('Change of plans')
                        setCancelTarget(reservation)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="md"
                    className="mt-2 w-full"
                    iconLeft={<Navigation className="h-4 w-4" />}
                    disabled={!reservedPlace}
                    onClick={() => {
                      if (reservedPlace) openExternal(osmDirectionsUrl(reservedPlace))
                    }}
                  >
                    Navigate to place
                  </Button>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-text">Past parking</h2>
            <Link to="/driver/wallet" className="focus-ring inline-flex min-h-10 items-center gap-1 text-[11px] font-semibold text-accent">
              All payments
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-2">
            {history.slice(0, 6).map((reservation) => {
              const pastPlace = getPlace(reservation.placeId)
              return (
                <Card key={reservation.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-text">
                          {pastPlace?.name ?? 'Parking place'}
                        </h3>
                        <StatusBadge
                          tone={statusTone(reservation.status)}
                          label={reservation.status === 'completed' ? 'Completed' : 'Cancelled'}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        {formatDateTime(reservation.startAt)} · {reservation.plate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-text">
                        {formatCurrency(reservation.amount)}
                      </div>
                      <button
                        type="button"
                        onClick={() => openReceipt(reservation.paymentId)}
                        className="focus-ring mt-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-[10px] font-semibold text-accent"
                      >
                        <ReceiptText className="h-3 w-3" aria-hidden="true" />
                        Receipt
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      ) : null}

      <PaymentSheet
        open={Boolean(paymentIntent)}
        onClose={() => setPaymentIntent(null)}
        userId={user.id}
        amount={paymentIntent?.amount ?? 0}
        context={paymentIntent?.mode === 'extend' ? 'extend' : 'exit'}
        title={paymentIntent?.mode === 'extend' ? 'Extend parking' : 'Pay exit balance'}
        description={
          paymentIntent?.mode === 'extend'
            ? `Add ${paymentIntent.minutes} minutes to your current session.`
            : 'Settle the overstay balance to open the exit barrier.'
        }
        plate={active?.plate}
        placeName={place?.name}
        receiptLabel={
          paymentIntent?.mode === 'extend'
            ? `Parking extension · ${paymentIntent.minutes} min at ${formatCurrency(place?.pricePerHour ?? 0)}/hr · ${place?.name ?? ''}`
            : `Parking exit balance at ${formatCurrency(place?.pricePerHour ?? 0)}/hr · ${place?.name ?? ''}`
        }
        onSuccess={(result) => handlePaymentSuccess(result.payment.id)}
      />

      <BottomSheet
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel this booking?"
        description="The bay is released immediately. Any refund follows the policy shown below."
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="lg" onClick={() => setCancelTarget(null)}>
              Keep booking
            </Button>
            <Button variant="danger" size="lg" loading={cancelling} onClick={confirmCancel}>
              Cancel and refund
            </Button>
          </div>
        }
      >
        {cancelTarget ? (
          <div className="space-y-3 pb-2">
            <div className="rounded-2xl border border-line/80 bg-raised/40 p-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">Booking</span>
                <span className="font-mono font-semibold text-text">{cancelTarget.plate}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-muted">Paid</span>
                <span className="font-mono font-semibold text-text">{formatCurrency(cancelTarget.amount)}</span>
              </div>
            </div>
            <p className="rounded-xl border border-warning/25 bg-warning/8 px-3 py-2 text-[11px] leading-relaxed text-warning">
              {refundPolicy(cancelTarget.startAt).label}
            </p>
            <TextAreaField
              label="Reason for cancelling"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              hint="A short reason is stored in the audit trail."
            />
          </div>
        ) : null}
      </BottomSheet>

      <ReceiptSheet receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </div>
  )
}
