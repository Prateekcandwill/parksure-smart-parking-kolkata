import type { AppData, BookingRequest, Payment, Reservation, ParkingSession } from '@/types'
import { delay, getDB, mutateDB } from '@/api/db'
import { appendAudit } from '@/api/audit'
import { getBestFreeBay } from '@/api/places'
import { uid } from '@/utils/id'
import { roundCurrency } from '@/utils/format'
import { prettyPlate } from '@/utils/plates'

export class BookingError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'BookingError'
    this.code = code
  }
}

function paymentFor(draft: AppData, paymentId: string): Payment | undefined {
  return draft.payments.find((payment) => payment.id === paymentId)
}

function releaseBay(draft: AppData, reservation: Reservation): void {
  const otherHold = draft.reservations.some(
    (candidate) =>
      candidate.id !== reservation.id &&
      candidate.bayId === reservation.bayId &&
      (candidate.status === 'active' || candidate.status === 'upcoming'),
  )
  if (!otherHold) {
    draft.bays = draft.bays.map((bay) =>
      bay.id === reservation.bayId ? { ...bay, status: 'free', confidence: Math.max(90, bay.confidence) } : bay,
    )
  }
}

export function refundPolicy(startAt: string): { percent: number; label: string } {
  const hours = (new Date(startAt).getTime() - Date.now()) / 3_600_000
  if (hours > 2) return { percent: 90, label: 'More than 2 hours before start · 90% refund' }
  if (hours > 0) return { percent: 50, label: 'Within 2 hours of start · 50% refund' }
  return { percent: 0, label: 'After the start time · no automatic refund' }
}

export function getUserReservations(userId: string): Reservation[] {
  return getDB()
    .reservations.filter((reservation) => reservation.userId === userId)
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
}

export function getReservation(reservationId: string): Reservation | undefined {
  return getDB().reservations.find((reservation) => reservation.id === reservationId)
}

export function getActiveReservation(userId: string): Reservation | undefined {
  return getDB().reservations.find(
    (reservation) => reservation.userId === userId && reservation.status === 'active',
  )
}

export function getUpcomingReservations(userId: string): Reservation[] {
  return getDB().reservations.filter(
    (reservation) => reservation.userId === userId && reservation.status === 'upcoming',
  )
}

export async function createBooking(request: BookingRequest): Promise<{ reservation: Reservation; bayLabel: string }> {
  await delay(420)
  const db = getDB()
  const user = db.users.find((candidate) => candidate.id === request.userId)
  if (!user) throw new BookingError('unknown_user', 'Your session could not be verified. Sign in again.')

  const vehicle = db.vehicles.find(
    (candidate) => candidate.id === request.vehicleId && candidate.userId === request.userId,
  )
  if (!vehicle) throw new BookingError('unknown_vehicle', 'Choose a vehicle before booking.')

  const place = db.places.find((candidate) => candidate.id === request.placeId)
  if (!place || !place.active) throw new BookingError('place_unavailable', 'This place is not accepting bookings.')
  if (place.cameraOnly) {
    throw new BookingError(
      'camera_only',
      'This open ground uses camera estimates only. Choose a marked place to book a bay.',
    )
  }

  const start = new Date(request.startAt)
  const end = new Date(request.endAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new BookingError('invalid_time', 'Choose a valid start time and duration.')
  }
  if (request.type === 'prebook' && start.getTime() < Date.now() + 10 * 60_000) {
    throw new BookingError('invalid_time', 'Pre-bookings need a start time at least 10 minutes from now.')
  }

  const payment = paymentFor(db, request.paymentId)
  if (!payment || payment.status !== 'success' || payment.userId !== request.userId) {
    throw new BookingError('payment_required', 'A successful payment is required before a bay can be assigned.')
  }
  if (payment.method === 'cash') {
    throw new BookingError(
      'cash_not_allowed',
      'Cash is not accepted for pre-booked slots. Use UPI, QR, card, debit or FASTag.',
    )
  }

  const existing = db.reservations.find((reservation) => reservation.paymentId === payment.id)
  if (existing) {
    const bay = db.bays.find((candidate) => candidate.id === existing.bayId)
    return { reservation: existing, bayLabel: bay?.label ?? '—' }
  }

  const bay = getBestFreeBay(request.placeId)
  if (!bay) {
    throw new BookingError(
      'no_bays',
      'No bay currently meets the confidence threshold. Try another place or ask an operator.',
    )
  }

  const reservation: Reservation = {
    id: uid('res'),
    userId: request.userId,
    placeId: request.placeId,
    bayId: bay.id,
    vehicleId: request.vehicleId,
    plate: prettyPlate(vehicle.plate),
    type: request.type,
    status: request.type === 'instant' ? 'active' : 'upcoming',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    createdAt: new Date().toISOString(),
    amount: roundCurrency(request.amount),
    paymentId: payment.id,
    level: bay.level,
    row: bay.row,
    side: bay.side,
  }

  mutateDB((draft) => {
    draft.reservations.push(reservation)
    draft.bays = draft.bays.map((candidate) =>
      candidate.id === bay.id
        ? { ...candidate, status: 'reserved', confidence: Math.max(92, candidate.confidence) }
        : candidate,
    )
    appendAudit(draft, {
      actorId: user.id,
      actorName: user.name,
      actorRole: 'driver',
      action: request.type === 'prebook' ? 'Pre-booked parking bay' : 'Booked parking bay',
      target: `${place.name} · Bay ${bay.label} · ${reservation.plate}`,
      reason: request.type === 'prebook' ? 'Online payment captured' : 'Instant booking payment captured',
    })
  })

  return { reservation, bayLabel: bay.label }
}

export async function extendReservation(input: {
  reservationId: string
  minutes: number
  paymentId: string
  actorId: string
  actorName: string
}): Promise<Reservation> {
  await delay(380)
  let updated!: Reservation
  mutateDB((draft) => {
    const reservation = draft.reservations.find((candidate) => candidate.id === input.reservationId)
    if (!reservation || reservation.status !== 'active') {
      throw new BookingError('not_active', 'Only an active parking session can be extended.')
    }
    const payment = paymentFor(draft, input.paymentId)
    if (!payment || payment.status !== 'success') {
      throw new BookingError('payment_required', 'Payment must clear before the session can be extended.')
    }
    reservation.endAt = new Date(
      new Date(reservation.endAt).getTime() + input.minutes * 60_000,
    ).toISOString()
    reservation.amount = roundCurrency(reservation.amount + payment.amount)
    updated = reservation
    appendAudit(draft, {
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'driver',
      action: 'Extended parking session',
      target: `${reservation.id} · +${input.minutes} minutes`,
      reason: 'Online extension payment captured',
    })
  })
  return updated
}

export async function cancelReservation(input: {
  reservationId: string
  actorId: string
  actorName: string
  actorRole: 'driver' | 'operator' | 'admin'
  reason: string
}): Promise<Reservation> {
  await delay(320)
  let updated!: Reservation
  mutateDB((draft) => {
    const reservation = draft.reservations.find((candidate) => candidate.id === input.reservationId)
    if (!reservation || (reservation.status !== 'upcoming' && reservation.status !== 'active')) {
      throw new BookingError('not_cancellable', 'This booking can no longer be cancelled.')
    }
    reservation.status = 'cancelled'
    releaseBay(draft, reservation)
    updated = reservation
    appendAudit(draft, {
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: 'Cancelled reservation',
      target: reservation.id,
      reason: input.reason,
    })
  })
  return updated
}

export async function completeExit(input: {
  reservationId: string
  actorId: string
  actorName: string
}): Promise<{ reservation: Reservation; session: ParkingSession }> {
  await delay(320)
  let result!: { reservation: Reservation; session: ParkingSession }
  mutateDB((draft) => {
    const reservation = draft.reservations.find((candidate) => candidate.id === input.reservationId)
    if (!reservation || reservation.status !== 'active') {
      throw new BookingError('not_active', 'This parking session is no longer active.')
    }
    reservation.status = 'completed'
    releaseBay(draft, reservation)
    const session: ParkingSession = {
      id: uid('session'),
      reservationId: reservation.id,
      placeId: reservation.placeId,
      bayId: reservation.bayId,
      plate: reservation.plate,
      entryAt: reservation.startAt,
      exitAt: new Date().toISOString(),
      status: 'closed',
      amount: 0,
    }
    draft.sessions.push(session)
    draft.gateEvents.unshift({
      id: uid('gate'),
      placeId: reservation.placeId,
      direction: 'exit',
      plateRead: reservation.plate,
      plateExpected: reservation.plate,
      confidence: 98,
      at: new Date().toISOString(),
      status: 'cleared',
      paymentDue: 0,
      prebooked: reservation.type === 'prebook',
      reservationId: reservation.id,
      note: 'Prepaid session closed at exit; no balance due',
    })
    result = { reservation, session }
    appendAudit(draft, {
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'driver',
      action: 'Exited parking with no balance due',
      target: `${reservation.id} · ${reservation.plate}`,
      reason: 'Prepaid parking time covered the session',
    })
  })
  return result
}

export async function payAndExit(input: {
  reservationId: string
  paymentId: string
  actorId: string
  actorName: string
}): Promise<{ reservation: Reservation; session: ParkingSession }> {
  await delay(460)
  let result!: { reservation: Reservation; session: ParkingSession }
  mutateDB((draft) => {
    const reservation = draft.reservations.find((candidate) => candidate.id === input.reservationId)
    if (!reservation || reservation.status !== 'active') {
      throw new BookingError('not_active', 'This parking session is no longer active.')
    }
    const payment = paymentFor(draft, input.paymentId)
    if (!payment || payment.status !== 'success') {
      throw new BookingError('payment_required', 'The barrier stays closed until an exit payment succeeds.')
    }
    reservation.status = 'completed'
    releaseBay(draft, reservation)
    const session: ParkingSession = {
      id: uid('session'),
      reservationId: reservation.id,
      placeId: reservation.placeId,
      bayId: reservation.bayId,
      plate: reservation.plate,
      entryAt: reservation.startAt,
      exitAt: new Date().toISOString(),
      status: 'closed',
      amount: payment.amount,
      paymentId: payment.id,
    }
    draft.sessions.push(session)
    draft.gateEvents.unshift({
      id: uid('gate'),
      placeId: reservation.placeId,
      direction: 'exit',
      plateRead: reservation.plate,
      plateExpected: reservation.plate,
      confidence: 98,
      at: new Date().toISOString(),
      status: 'cleared',
      paymentDue: 0,
      prebooked: reservation.type === 'prebook',
      reservationId: reservation.id,
      note: 'Self-service exit payment cleared',
    })
    result = { reservation, session }
    appendAudit(draft, {
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: 'driver',
      action: 'Paid and exited parking',
      target: `${reservation.id} · ${payment.reference}`,
      reason: 'Barrier opened after successful payment',
    })
  })
  return result
}
