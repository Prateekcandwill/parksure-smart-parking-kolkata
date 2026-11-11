import type { Alert, CashShift, GateEvent, PaymentResult, User } from '@/types'
import { delay, getDB, mutateDB } from '@/api/db'
import { appendAudit } from '@/api/audit'
import { processPayment } from '@/api/payments'
import { uid } from '@/utils/id'
import { roundCurrency } from '@/utils/format'
import { prettyPlate } from '@/utils/plates'

export function getGateEvents(placeId: string): GateEvent[] {
  return getDB()
    .gateEvents.filter((event) => event.placeId === placeId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export function getPendingGateEvents(placeId: string): GateEvent[] {
  return getGateEvents(placeId).filter((event) => event.status === 'pending')
}

export function getOpenShift(attendantId: string, placeId: string): CashShift | undefined {
  return getDB().shifts.find(
    (shift) =>
      shift.attendantId === attendantId &&
      shift.placeId === placeId &&
      shift.status === 'open',
  )
}

export function getShiftsForPlace(placeId: string): CashShift[] {
  return getDB()
    .shifts.filter((shift) => shift.placeId === placeId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
}

export async function confirmGateEvent(input: {
  eventId: string
  attendant: User
  note?: string
}): Promise<{ barrierOpened: boolean; paymentDue: number; event: GateEvent }> {
  await delay(340)
  let result!: { barrierOpened: boolean; paymentDue: number; event: GateEvent }
  mutateDB((draft) => {
    const event = draft.gateEvents.find((candidate) => candidate.id === input.eventId)
    if (!event || event.status !== 'pending') {
      throw new Error('This vehicle is no longer in the gate queue.')
    }
    event.attendantId = input.attendant.id
    event.note = input.note ?? 'Plate confirmed by attendant'
    const paymentDue = event.direction === 'exit' ? (event.paymentDue ?? 0) : 0

    if (paymentDue > 0) {
      result = { barrierOpened: false, paymentDue, event }
      appendAudit(draft, {
        actorId: input.attendant.id,
        actorName: input.attendant.name,
        actorRole: 'attendant',
        action: 'Confirmed ANPR plate',
        target: `${event.plateRead} · ${event.placeId}`,
        reason: 'Plate confirmed; barrier held until exit payment clears',
      })
      return
    }

    event.status = 'cleared'
    if (event.direction === 'entry') {
      const hasSession = draft.sessions.some(
        (session) => session.status === 'active' && session.plate === event.plateRead,
      )
      if (!hasSession) {
        draft.sessions.push({
          id: uid('session'),
          placeId: event.placeId,
          plate: event.plateRead,
          entryAt: new Date().toISOString(),
          status: 'active',
          amount: 0,
          gateEventId: event.id,
        })
      }
    }

    result = { barrierOpened: true, paymentDue: 0, event }
    appendAudit(draft, {
      actorId: input.attendant.id,
      actorName: input.attendant.name,
      actorRole: 'attendant',
      action: `Confirmed ANPR ${event.direction}`,
      target: `${event.plateRead} · ${event.placeId}`,
      reason: 'Plate matched; barrier opened',
    })
  })
  return result
}

export async function refuseGateEvent(input: {
  eventId: string
  attendant: User
  reason: string
}): Promise<GateEvent> {
  await delay(300)
  let updated!: GateEvent
  mutateDB((draft) => {
    const event = draft.gateEvents.find((candidate) => candidate.id === input.eventId)
    if (!event || event.status !== 'pending') throw new Error('This vehicle is no longer in the queue.')
    event.status = 'refused'
    event.attendantId = input.attendant.id
    event.note = input.reason
    updated = event
    appendAudit(draft, {
      actorId: input.attendant.id,
      actorName: input.attendant.name,
      actorRole: 'attendant',
      action: 'Refused gate entry',
      target: `${event.plateRead} · ${event.placeId}`,
      reason: input.reason,
    })
  })
  return updated
}

export async function callOperator(input: {
  eventId: string
  attendant: User
  note: string
}): Promise<Alert> {
  await delay(360)
  let alert!: Alert
  mutateDB((draft) => {
    const event = draft.gateEvents.find((candidate) => candidate.id === input.eventId)
    if (!event) throw new Error('This vehicle is no longer in the queue.')
    alert = {
      id: uid('alert'),
      placeId: event.placeId,
      type: 'ticket',
      severity: 'warning',
      status: 'open',
      message: `Attendant ${input.attendant.staffId ?? input.attendant.name} called an operator for ${event.plateRead}. ${input.note}`,
      createdAt: new Date().toISOString(),
    }
    draft.alerts.unshift(alert)
    event.note = input.note
    appendAudit(draft, {
      actorId: input.attendant.id,
      actorName: input.attendant.name,
      actorRole: 'attendant',
      action: 'Called operator to gate',
      target: `${event.plateRead} · ${event.placeId}`,
      reason: input.note,
    })
  })
  return alert
}

export async function manualGateEntry(input: {
  placeId: string
  plate: string
  attendant: User
  direction: 'entry' | 'exit'
}): Promise<GateEvent> {
  await delay(300)
  const event: GateEvent = {
    id: uid('gate'),
    placeId: input.placeId,
    direction: input.direction,
    plateRead: prettyPlate(input.plate),
    confidence: 100,
    at: new Date().toISOString(),
    status: 'cleared',
    attendantId: input.attendant.id,
    note: 'Manual plate entry',
  }
  mutateDB((draft) => {
    draft.gateEvents.unshift(event)
    if (input.direction === 'entry') {
      draft.sessions.push({
        id: uid('session'),
        placeId: input.placeId,
        plate: event.plateRead,
        entryAt: new Date().toISOString(),
        status: 'active',
        amount: 0,
        gateEventId: event.id,
      })
    }
    appendAudit(draft, {
      actorId: input.attendant.id,
      actorName: input.attendant.name,
      actorRole: 'attendant',
      action: 'Manually entered plate',
      target: `${event.plateRead} · ${input.placeId}`,
      reason: 'ANPR could not read the plate',
    })
  })
  return event
}

export async function settleGateEventOnline(input: {
  eventId: string
  attendant: User
  paymentId: string
}): Promise<GateEvent> {
  await delay(280)
  let updated!: GateEvent
  mutateDB((draft) => {
    const event = draft.gateEvents.find((candidate) => candidate.id === input.eventId)
    if (!event || event.status !== 'pending') throw new Error('This vehicle is no longer in the gate queue.')
    const payment = draft.payments.find((candidate) => candidate.id === input.paymentId)
    if (!payment || payment.status !== 'success' || payment.kind !== 'payment') {
      throw new Error('The online payment has not cleared yet.')
    }
    event.status = 'cleared'
    event.attendantId = input.attendant.id
    event.paymentDue = 0
    event.note = 'Pre-booked overstay paid online; barrier opened'
    updated = event
    appendAudit(draft, {
      actorId: input.attendant.id,
      actorName: input.attendant.name,
      actorRole: 'attendant',
      action: 'Cleared pre-booked exit after online payment',
      target: `${event.plateRead} · ₹${payment.amount.toFixed(2)}`,
      reason: 'Cash not accepted for pre-booked slots',
    })
  })
  return updated
}

export async function collectCash(input: {
  eventId: string
  attendant: User
  amountReceived: number
  note?: string
}): Promise<PaymentResult & { change: number }> {
  await delay(260)
  const db = getDB()
  const event = db.gateEvents.find((candidate) => candidate.id === input.eventId)
  if (!event) throw new Error('This vehicle is no longer in the gate queue.')
  if (event.prebooked) {
    throw new Error('Cash is not accepted for pre-booked slots. Ask the driver to use an online method.')
  }
  const due = event.paymentDue ?? 0
  if (due <= 0) throw new Error('There is no cash due for this vehicle.')
  if (input.amountReceived < due) throw new Error('The amount received is less than the amount due.')

  let shift = getOpenShift(input.attendant.id, event.placeId)
  if (!shift) {
    const newShift: CashShift = {
      id: uid('shift'),
      placeId: event.placeId,
      attendantId: input.attendant.id,
      startedAt: new Date().toISOString(),
      status: 'open',
      cashCollected: 0,
      transactions: 0,
      openingFloat: 500,
    }
    mutateDB((draft) => {
      draft.shifts.push(newShift)
    })
    shift = newShift
  }

  const reservation = db.reservations.find(
    (candidate) =>
      candidate.id === event.reservationId ||
      (candidate.plate === event.plateRead &&
        (candidate.status === 'active' || candidate.status === 'upcoming')),
  )
  const fallbackUser = db.users.find((candidate) => candidate.id === 'u_driver')
  const paymentUserId = reservation?.userId ?? fallbackUser?.id ?? input.attendant.id
  const place = db.places.find((candidate) => candidate.id === event.placeId)

  const result = await processPayment({
    userId: paymentUserId,
    amount: due,
    method: 'cash',
    context: 'cash',
    idempotencyKey: `cash_${event.id}_${Date.now()}`,
    allowCash: true,
    prebooked: event.prebooked,
    attendantId: input.attendant.id,
    shiftId: shift.id,
    receiptLabel: `Cash parking exit · ${place?.name ?? event.placeId}`,
    placeName: place?.name,
    plate: event.plateRead,
    actorId: input.attendant.id,
    actorName: input.attendant.name,
    actorRole: 'attendant',
  })

  mutateDB((draft) => {
    const target = draft.gateEvents.find((candidate) => candidate.id === input.eventId)
    if (target) {
      target.status = 'cleared'
      target.attendantId = input.attendant.id
      target.paymentDue = 0
      target.note = input.note ?? 'Cash collected; barrier opened'
    }
    appendAudit(draft, {
      actorId: input.attendant.id,
      actorName: input.attendant.name,
      actorRole: 'attendant',
      action: 'Collected cash and opened exit barrier',
      target: `${event.plateRead} · ₹${due.toFixed(2)}`,
      reason: input.note ?? 'Attendant-assisted exit payment',
    })
  })

  return {
    ...result,
    change: roundCurrency(input.amountReceived - due),
  }
}

export async function reconcileShift(input: {
  shiftId: string
  operator: User
  countedAmount: number
  reason: string
}): Promise<CashShift> {
  await delay(420)
  let updated!: CashShift
  mutateDB((draft) => {
    const shift = draft.shifts.find((candidate) => candidate.id === input.shiftId)
    if (!shift) throw new Error('Shift not found.')
    if (shift.status === 'reconciled') throw new Error('This shift is already reconciled.')
    const variance = roundCurrency(input.countedAmount - shift.cashCollected)
    if (Math.abs(variance) > 0.009 && input.reason.trim().length < 3) {
      throw new Error('Add a reason for the cash variance before reconciling.')
    }
    shift.status = 'reconciled'
    shift.endedAt = new Date().toISOString()
    shift.reconciledAt = new Date().toISOString()
    shift.countedAmount = roundCurrency(input.countedAmount)
    shift.variance = variance
    shift.reason = input.reason
    shift.reconciledBy = input.operator.id
    updated = shift
    appendAudit(draft, {
      actorId: input.operator.id,
      actorName: input.operator.name,
      actorRole: 'operator',
      action: 'Reconciled cash shift',
      target: `${shift.id} · counted ₹${input.countedAmount.toFixed(2)}`,
      reason: input.reason || 'No variance',
    })
  })
  return updated
}
