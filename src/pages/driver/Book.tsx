import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { BookingType } from '@/types'
import { useDB } from '@/api/useDB'
import { getPlace } from '@/api/places'
import { createBooking } from '@/api/bookings'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { DemandBadge } from '@/components/parking/PriceTag'
import { PaymentSheet } from '@/components/payments/PaymentSheet'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ScratchReveal } from '@/components/ui/ScratchReveal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TextField } from '@/components/ui/Input'
import { toast } from '@/store/toast'
import { haptic } from '@/utils/haptics'
import {
  combineDateTime,
  formatCurrency,
  formatDateTime,
  priceBreakdown,
  toLocalDateInput,
  toLocalTimeInput,
} from '@/utils/format'

const durationOptions = [30, 60, 120, 240]

export default function BookPage() {
  const db = useDB()
  const user = useCurrentUser()
  const navigate = useNavigate()
  const { placeId } = useParams()
  const [searchParams] = useSearchParams()
  const place = placeId ? getPlace(placeId) : undefined

  const [type, setType] = useState<BookingType>(
    searchParams.get('type') === 'prebook' ? 'prebook' : 'instant',
  )
  const vehicles = useMemo(
    () => (user ? db.vehicles.filter((vehicle) => vehicle.userId === user.id) : []),
    [db.vehicles, user],
  )
  const [vehicleId, setVehicleId] = useState(
    () => vehicles.find((vehicle) => vehicle.isDefault)?.id ?? vehicles[0]?.id ?? '',
  )
  const [minutes, setMinutes] = useState(60)
  const [prebookDate, setPrebookDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(10, 0, 0, 0)
    return toLocalDateInput(date)
  })
  const [prebookTime, setPrebookTime] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(10, 0, 0, 0)
    return toLocalTimeInput(date)
  })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [revealOpen, setRevealOpen] = useState(false)
  const [booking, setBooking] = useState<{ reservationId: string; bayLabel: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  if (!place) {
    return (
      <Card>
        <EmptyState
          icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
          title="Place not found"
          body="This lot is no longer available for booking. Search again for live parking nearby."
          action={
            <Link to="/driver/find" className={buttonClasses('primary', 'lg', 'w-full')}>
              Back to search
            </Link>
          }
        />
      </Card>
    )
  }

  const vehicle = vehicles.find((candidate) => candidate.id === vehicleId)
  const startAt =
    type === 'prebook'
      ? (() => {
          try {
            return combineDateTime(prebookDate, prebookTime)
          } catch {
            return new Date().toISOString()
          }
        })()
      : new Date().toISOString()
  const endAt = new Date(new Date(startAt).getTime() + minutes * 60_000).toISOString()
  const breakdown = priceBreakdown(place.pricePerHour, minutes)

  const validate = (): string | null => {
    if (!vehicle) return 'Choose a vehicle before booking.'
    if (type === 'prebook') {
      const start = new Date(startAt)
      if (Number.isNaN(start.getTime())) return 'Choose a valid date and time.'
      if (start.getTime() < Date.now() + 10 * 60_000) {
        return 'Pre-bookings need a start time at least 10 minutes from now.'
      }
    }
    return null
  }

  const startPayment = () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      haptic('error')
      return
    }
    setError(null)
    haptic('tap')
    setPaymentOpen(true)
  }

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!vehicle) return
    try {
      const created = await createBooking({
        userId: user.id,
        placeId: place.id,
        vehicleId: vehicle.id,
        type,
        startAt,
        endAt,
        amount: breakdown.total,
        paymentId,
      })
      setBooking({ reservationId: created.reservation.id, bayLabel: created.bayLabel })
      setPaymentOpen(false)
      setRevealOpen(true)
      haptic('success')
      toast({
        tone: 'success',
        title: 'Bay reserved',
        message: `${place.name} · Bay ${created.bayLabel}. Your pass is ready.`,
      })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'The booking could not be confirmed.'
      setError(message)
      setPaymentOpen(false)
      toast({ tone: 'error', title: 'Booking not confirmed', message })
    }
  }

  return (
    <div>
      <PageHeader
        back
        eyebrow="Driver · Checkout"
        title={type === 'prebook' ? 'Pre-book your bay' : 'Book a bay'}
        description={`${place.name} · ${place.address}`}
        action={<StatusBadge tone="info" label={`${place.freeBays} free`} />}
      />

      <div className="space-y-4">
        <Card className="p-4">
          <SegmentedControl
            ariaLabel="Choose booking type"
            value={type}
            onChange={(next) => {
              haptic('tap')
              setType(next)
              setError(null)
            }}
            options={[
              { value: 'instant', label: 'Book now' },
              { value: 'prebook', label: 'Pre-book' },
            ]}
          />
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            {type === 'instant'
              ? 'The best available bay is assigned as soon as payment clears. Your pass appears under Trip.'
              : 'Choose a start time at least 10 minutes ahead. The bay is held for 20 minutes after your start time.'}
          </p>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Car className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">Vehicle</h2>
          </div>
          {vehicles.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-muted">
              No vehicle is linked to this account. Register a driver account or ask support to add one.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vehicles.map((candidate) => (
                <Chip
                  key={candidate.id}
                  active={candidate.id === vehicleId}
                  onClick={() => {
                    haptic('tap')
                    setVehicleId(candidate.id)
                    setError(null)
                  }}
                  className="min-h-12"
                >
                  <span className="font-mono">{candidate.plate}</span>
                  <span className="text-[10px] font-normal opacity-75">
                    {candidate.make} {candidate.model}
                  </span>
                </Chip>
              ))}
            </div>
          )}
          {vehicle?.fastagId ? (
            <p className="mt-3 text-[10px] text-muted">
              FASTag linked · {formatCurrency(vehicle.fastagBalance ?? 0)} balance
            </p>
          ) : null}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">Duration</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {durationOptions.map((option) => (
              <Chip
                key={option}
                active={minutes === option}
                onClick={() => {
                  haptic('tap')
                  setMinutes(option)
                  setError(null)
                }}
                className="min-h-12"
              >
                {option < 60 ? `${option} min` : `${option / 60} hr${option > 60 ? 's' : ''}`}
              </Chip>
            ))}
          </div>

          {type === 'prebook' ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <TextField
                label="Start date"
                type="date"
                value={prebookDate}
                min={toLocalDateInput(new Date())}
                onChange={(event) => {
                  setPrebookDate(event.target.value)
                  setError(null)
                }}
              />
              <TextField
                label="Start time"
                type="time"
                value={prebookTime}
                onChange={(event) => {
                  setPrebookTime(event.target.value)
                  setError(null)
                }}
              />
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-line/80 bg-ink/30 px-3 py-2.5 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {formatDateTime(startAt)}
            </span>
            <span>to {formatDateTime(endAt)}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">Price breakdown</h2>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/70 bg-ink/25 px-3 py-2.5">
            <div>
              <div className="label-caps">Live rate</div>
              <div className="mt-0.5 font-mono text-sm font-semibold text-text">
                {formatCurrency(place.pricePerHour)}/hr
              </div>
            </div>
            <div className="text-right">
              <DemandBadge place={place} withReason />
              <div className="mt-1 text-[10px] text-muted">{place.pricingReason}</div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted">
              <span>Base rate</span>
              <span className="font-mono text-text/85">{formatCurrency(place.basePricePerHour)}/hr</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Demand adjustment</span>
              <span className="font-mono text-text/85">
                {place.demandMultiplier === 1 ? 'None' : `×${place.demandMultiplier.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>
                Parking · {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`} at{' '}
                {formatCurrency(place.pricePerHour)}/hr
              </span>
              <span className="font-mono text-text/85">{formatCurrency(breakdown.base)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>CGST 9%</span>
              <span className="font-mono text-text/85">{formatCurrency(breakdown.cgst)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>SGST 9%</span>
              <span className="font-mono text-text/85">{formatCurrency(breakdown.sgst)}</span>
            </div>
            <div className="flex justify-between border-t border-line/70 pt-2 text-sm font-semibold text-text">
              <span>Total due</span>
              <span className="font-mono text-accent">{formatCurrency(breakdown.total)}</span>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            Simulated payment. A GST invoice is generated after success and stored in Wallet.
          </p>
        </Card>

        {error ? (
          <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          size="lg"
          className="w-full"
          iconLeft={<Sparkles className="h-4 w-4" />}
          onClick={startPayment}
          disabled={!vehicle}
        >
          Pay {formatCurrency(breakdown.total)} and reserve
        </Button>
        <p className="pb-2 text-center text-[10px] text-muted">
          By continuing you agree to the demo parking rules and privacy notice.
        </p>
      </div>

      <PaymentSheet
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        userId={user.id}
        amount={breakdown.total}
        context={type === 'prebook' ? 'prebook' : 'booking'}
        title={type === 'prebook' ? 'Pay for pre-booking' : 'Pay for parking'}
        description={`${place.name} · ${minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}`}
        plate={vehicle?.plate}
        placeName={place.name}
        receiptLabel={`${type === 'prebook' ? 'Pre-booked' : 'Parking'} · ${minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`} at ${formatCurrency(place.pricePerHour)}/hr · ${place.name}${place.isSurge ? ` · peak ×${place.demandMultiplier.toFixed(2)}` : ''}`}
        onSuccess={(result) => handlePaymentSuccess(result.payment.id)}
      />

      <BottomSheet
        open={revealOpen}
        onClose={() => setRevealOpen(false)}
        title="Your bay is confirmed"
        description="Scratch the gold panel to reveal the bay assigned to you."
        size="lg"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="lg" onClick={() => setRevealOpen(false)}>
              Close
            </Button>
            <Button
              size="lg"
              iconRight={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                setRevealOpen(false)
                navigate('/driver/trip')
              }}
            >
              View trip
            </Button>
          </div>
        }
      >
        {booking ? (
          <div className="space-y-4 pb-2">
            <ScratchReveal label="Scratch to reveal bay">
              <div className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  Bay assigned
                </div>
                <div className="font-mono text-5xl font-semibold tracking-tight text-accent">
                  {booking.bayLabel}
                </div>
                <div className="text-sm font-semibold text-text">{place.name}</div>
                <div className="font-mono text-xs text-muted">{vehicle?.plate}</div>
              </div>
            </ScratchReveal>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line/80 bg-raised/40 p-3 text-[11px]">
              <div>
                <div className="text-muted">Start</div>
                <div className="mt-0.5 font-semibold text-text">{formatDateTime(startAt)}</div>
              </div>
              <div>
                <div className="text-muted">End</div>
                <div className="mt-0.5 font-semibold text-text">{formatDateTime(endAt)}</div>
              </div>
            </div>
            <p className="text-center text-[11px] leading-relaxed text-muted">
              Keep the parking pass visible until you exit. The barrier opens automatically after plate
              confirmation.
            </p>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  )
}
