import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRightLeft,
  Banknote,
  CircleHelp,
  Gauge,
  LayoutDashboard,
  ScanLine,
  Ticket,
  Wrench,
} from 'lucide-react'
import type { Bay } from '@/types'
import { useDB } from '@/api/useDB'
import { getBays, getPlaceQueue, getRevenueToday } from '@/api/places'
import { markSensorFaulty, openTicket, reassignReservation } from '@/api/alerts'
import { useActivePlace } from '@/hooks/useActivePlace'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceSwitcher } from '@/components/layout/PlaceSwitcher'
import { BayMap } from '@/components/parking/BayMap'
import { StatTile } from '@/components/common/StatTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button, buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { TextField } from '@/components/ui/Input'
import { ConfidenceBadge, StatusBadge, bayLabel, bayTone } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatCurrency, formatRelative } from '@/utils/format'
import { computeFusion } from '@/utils/fusion'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'

export default function LotPage() {
  const db = useDB()
  const user = useCurrentUser()
  const place = useActivePlace()
  const [selectedBayId, setSelectedBayId] = useState<string | null>(null)
  const [faultOpen, setFaultOpen] = useState(false)
  const [faultReason, setFaultReason] = useState('')
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketMessage, setTicketMessage] = useState('')
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignBayId, setReassignBayId] = useState<string | null>(null)
  const [reassignReason, setReassignReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setSelectedBayId(null)
  }, [place?.id])

  const bays = useMemo(() => (place ? getBays(place.id) : []), [db.bays, place])
  const selectedBay: Bay | undefined = selectedBayId
    ? db.bays.find((bay) => bay.id === selectedBayId)
    : undefined
  const sensor = selectedBay ? db.sensors.find((candidate) => candidate.bayId === selectedBay.id) : undefined
  const reservation = selectedBay
    ? db.reservations.find(
        (candidate) =>
          candidate.bayId === selectedBay.id &&
          (candidate.status === 'active' || candidate.status === 'upcoming'),
      )
    : undefined
  const reservationPayment = reservation
    ? db.payments.find((payment) => payment.id === reservation.paymentId)
    : undefined
  const fusion = selectedBay
    ? computeFusion(selectedBay, sensor, reservation, reservationPayment, db.settings.thresholds)
    : undefined

  const activeReservations = useMemo(
    () =>
      place
        ? db.reservations
            .filter(
              (candidate) =>
                candidate.placeId === place.id &&
                (candidate.status === 'active' || candidate.status === 'upcoming'),
            )
            .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
        : [],
    [db.reservations, place],
  )

  const freeTargets = bays.filter((bay) => bay.status === 'free' && bay.id !== selectedBay?.id).slice(0, 16)

  if (!user || !place) return null

  const submitFault = async () => {
    if (!selectedBay) return
    if (faultReason.trim().length < 3) {
      toast({ tone: 'warning', title: 'Add a reason', message: 'At least 3 characters for the audit trail.' })
      return
    }
    setSubmitting(true)
    try {
      await markSensorFaulty({
        placeId: place.id,
        bayId: selectedBay.id,
        operator: user,
        reason: faultReason.trim(),
      })
      haptic('warning')
      toast({ tone: 'success', title: 'Sensor marked faulty', message: `Bay ${selectedBay.label} is now unknown.` })
      setFaultOpen(false)
      setFaultReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not mark the sensor',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitTicket = async () => {
    if (ticketMessage.trim().length < 4) {
      toast({ tone: 'warning', title: 'Describe the issue', message: 'At least 4 characters.' })
      return
    }
    setSubmitting(true)
    try {
      await openTicket({
        placeId: place.id,
        operator: user,
        message: ticketMessage.trim(),
        bayId: selectedBay?.id,
      })
      haptic('success')
      toast({ tone: 'success', title: 'Ticket opened', message: 'Visible in the alert queue.' })
      setTicketOpen(false)
      setTicketMessage('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not open a ticket',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitReassign = async () => {
    if (!reservation || !reassignBayId) {
      toast({ tone: 'warning', title: 'Choose a target bay', message: 'Pick a free bay first.' })
      return
    }
    if (reassignReason.trim().length < 3) {
      toast({ tone: 'warning', title: 'Add a reason', message: 'At least 3 characters.' })
      return
    }
    setSubmitting(true)
    try {
      await reassignReservation({
        reservationId: reservation.id,
        bayId: reassignBayId,
        operator: user,
        reason: reassignReason.trim(),
      })
      haptic('success')
      toast({ tone: 'success', title: 'Reservation moved', message: 'The old bay is free again.' })
      setReassignOpen(false)
      setReassignBayId(null)
      setReassignReason('')
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not reassign the bay',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Lot"
        title={place.name}
        description="Live bay state, fusion confidence and exception handling for this place."
        action={<PlaceSwitcher />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge live />
        <StatusBadge
          tone={place.occupancyPercent >= 85 ? 'danger' : place.occupancyPercent >= 60 ? 'warning' : 'success'}
          label={`${place.occupancyPercent}% occupied`}
        />
        <StatusBadge tone="neutral" label={`${place.totalBays} bays`} />
        <Link
          to="/operator/cash"
          className={buttonClasses('secondary', 'md', 'ml-auto min-h-10 px-3 text-[11px]')}
        >
          <Banknote className="h-4 w-4" aria-hidden="true" />
          Cash reconciliation
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Free bays"
          value={String(place.freeBays)}
          icon={<LayoutDashboard className="h-4 w-4" />}
          tone="success"
        />
        <StatTile
          label="Occupancy"
          value={`${place.occupancyPercent}%`}
          icon={<Gauge className="h-4 w-4" />}
          tone={place.occupancyPercent >= 85 ? 'danger' : 'warning'}
        />
        <StatTile
          label="Revenue today"
          value={formatCurrency(getRevenueToday(place.id))}
          icon={<Banknote className="h-4 w-4" />}
          tone="accent"
        />
        <StatTile
          label="Gate queue"
          value={String(getPlaceQueue(place.id))}
          icon={<ScanLine className="h-4 w-4" />}
          tone={getPlaceQueue(place.id) > 0 ? 'warning' : 'success'}
        />
      </div>

      <BayMap placeId={place.id} selectedBayId={selectedBayId} onSelectBay={(bay) => setSelectedBayId(bay.id)} />

      {selectedBay && fusion ? (
        <Card strong className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="label-caps">Bay detail</div>
              <div className="mt-1 flex items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-text">Bay {selectedBay.label}</h2>
                <StatusBadge tone={bayTone(selectedBay.status)} label={bayLabel(selectedBay.status)} />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                Level {selectedBay.level} · Row {selectedBay.row} · {selectedBay.side}
              </p>
            </div>
            <ConfidenceBadge confidence={fusion.confidence} size="md" />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-text/85">{fusion.summary}</p>

          <div className="mt-4 space-y-2">
            {fusion.factors.map((factor) => (
              <div
                key={`${factor.label}-${factor.value}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-line/80 bg-raised/40 px-3 py-2"
              >
                <span className="text-xs font-semibold text-text">{factor.label}</span>
                <span className="text-right text-[11px] text-muted">{factor.value}</span>
                <StatusBadge
                  tone={factor.weight === 'high' ? 'info' : factor.weight === 'medium' ? 'warning' : 'neutral'}
                  label={factor.weight}
                />
              </div>
            ))}
          </div>

          {reservation ? (
            <div className="mt-4 rounded-2xl border border-warning/25 bg-warning/8 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-text">Reservation hold</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted">{reservation.plate}</div>
                </div>
                <StatusBadge tone="warning" label={reservation.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span>Ends {formatRelative(reservation.endAt)}</span>
                <span className="font-mono">{formatCurrency(reservation.amount)}</span>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Button
              variant="secondary"
              iconLeft={<Wrench className="h-4 w-4" />}
              onClick={() => {
                haptic('tap')
                setFaultOpen(true)
                setFaultReason('')
              }}
            >
              Mark faulty
            </Button>
            <Button
              variant="secondary"
              iconLeft={<Ticket className="h-4 w-4" />}
              onClick={() => {
                haptic('tap')
                setTicketOpen(true)
                setTicketMessage('')
              }}
            >
              Open ticket
            </Button>
            <Button
              variant="secondary"
              disabled={!reservation}
              iconLeft={<ArrowRightLeft className="h-4 w-4" />}
              onClick={() => {
                haptic('tap')
                setReassignOpen(true)
                setReassignBayId(null)
                setReassignReason('')
              }}
            >
              Reassign bay
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-text">Select a bay</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Tap any bay on the map to inspect its fusion factors, mark a sensor faulty, open a ticket or move a
                reservation.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">Active reservations</h3>
        </div>
        {activeReservations.length === 0 ? (
          <p className="text-xs text-muted">No active or upcoming holds at this place.</p>
        ) : (
          <ul className="space-y-2">
            {activeReservations.map((item) => {
              const bay = db.bays.find((candidate) => candidate.id === item.bayId)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      haptic('tap')
                      setSelectedBayId(item.bayId)
                    }}
                    className="focus-ring flex w-full items-center justify-between gap-3 rounded-xl border border-line/80 bg-raised/30 px-3 py-2.5 text-left transition-colors hover:border-accent/30"
                  >
                    <div>
                      <div className="font-mono text-xs font-semibold text-text">{item.plate}</div>
                      <div className="mt-0.5 text-[10px] text-muted">
                        Bay {bay?.label ?? '—'} · ends {formatRelative(item.endAt)}
                      </div>
                    </div>
                    <StatusBadge tone={item.status === 'active' ? 'success' : 'warning'} label={item.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <BottomSheet
        open={faultOpen}
        onClose={() => setFaultOpen(false)}
        title={`Mark bay ${selectedBay?.label ?? ''} faulty`}
        description="Readings are suspended and the bay becomes unknown until it is serviced."
        footer={
          <Button variant="danger" size="lg" className="w-full" loading={submitting} onClick={() => void submitFault()}>
            Mark sensor faulty
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <TextField
            label="Reason"
            placeholder="Magnetometer stuck on occupied"
            value={faultReason}
            onChange={(event) => setFaultReason(event.target.value)}
          />
          <div className="rounded-xl border border-warning/25 bg-warning/8 p-3 text-[11px] leading-relaxed text-warning">
            This opens a critical sensor alert and removes the bay from booking until confidence is restored.
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Open an operator ticket"
        description="Use for anything that needs a human follow-up."
        footer={
          <Button size="lg" className="w-full" loading={submitting} onClick={() => void submitTicket()}>
            Open ticket
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <TextField
            label="Issue"
            placeholder="Vehicle parked across two bays"
            value={ticketMessage}
            onChange={(event) => setTicketMessage(event.target.value)}
            hint={selectedBay ? `Linked to bay ${selectedBay.label}` : 'Not linked to a bay'}
          />
        </div>
      </BottomSheet>

      <BottomSheet
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title="Reassign reservation"
        description="Move the hold to a free bay at this place. The old bay is released."
        footer={
          <Button size="lg" className="w-full" loading={submitting} onClick={() => void submitReassign()}>
            Move reservation
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <div>
            <div className="label-caps mb-2">Target free bay</div>
            {freeTargets.length === 0 ? (
              <p className="text-xs text-muted">No free bay is available right now.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {freeTargets.map((bay) => (
                  <Chip
                    key={bay.id}
                    active={reassignBayId === bay.id}
                    onClick={() => {
                      haptic('tap')
                      setReassignBayId(bay.id)
                    }}
                  >
                    {bay.label} · {bay.confidence}%
                  </Chip>
                ))}
              </div>
            )}
          </div>
          <TextField
            label="Reason"
            placeholder="Original bay blocked by a delivery van"
            value={reassignReason}
            onChange={(event) => setReassignReason(event.target.value)}
          />
        </div>
      </BottomSheet>
    </div>
  )
}
