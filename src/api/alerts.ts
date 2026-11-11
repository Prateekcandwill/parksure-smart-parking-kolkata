import type { Alert, User } from '@/types'
import { delay, getDB, mutateDB } from '@/api/db'
import { appendAudit } from '@/api/audit'
import { uid } from '@/utils/id'

export function getAlerts(placeId?: string): Alert[] {
  return getDB()
    .alerts.filter((alert) => !placeId || alert.placeId === placeId)
    .sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 }
      return rank[a.severity] - rank[b.severity] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
}

export function getOpenAlerts(placeId?: string): Alert[] {
  return getAlerts(placeId).filter((alert) => alert.status !== 'resolved')
}

export async function acknowledgeAlert(alertId: string, operator: User): Promise<Alert> {
  await delay(260)
  let updated!: Alert
  mutateDB((draft) => {
    const alert = draft.alerts.find((candidate) => candidate.id === alertId)
    if (!alert) throw new Error('Alert not found.')
    alert.status = 'acknowledged'
    alert.acknowledgedAt = new Date().toISOString()
    alert.assignedTo = operator.id
    updated = alert
    appendAudit(draft, {
      actorId: operator.id,
      actorName: operator.name,
      actorRole: 'operator',
      action: 'Acknowledged alert',
      target: alert.message,
      reason: 'Operator review',
    })
  })
  return updated
}

export async function assignAlert(alertId: string, operator: User): Promise<Alert> {
  await delay(220)
  let updated!: Alert
  mutateDB((draft) => {
    const alert = draft.alerts.find((candidate) => candidate.id === alertId)
    if (!alert) throw new Error('Alert not found.')
    alert.assignedTo = operator.id
    if (alert.status === 'open') alert.status = 'acknowledged'
    alert.acknowledgedAt = alert.acknowledgedAt ?? new Date().toISOString()
    updated = alert
    appendAudit(draft, {
      actorId: operator.id,
      actorName: operator.name,
      actorRole: 'operator',
      action: 'Assigned alert to self',
      target: alert.message,
      reason: 'Ownership for resolution',
    })
  })
  return updated
}

export async function resolveAlert(alertId: string, operator: User, reason: string): Promise<Alert> {
  await delay(280)
  let updated!: Alert
  mutateDB((draft) => {
    const alert = draft.alerts.find((candidate) => candidate.id === alertId)
    if (!alert) throw new Error('Alert not found.')
    alert.status = 'resolved'
    alert.assignedTo = operator.id
    updated = alert
    appendAudit(draft, {
      actorId: operator.id,
      actorName: operator.name,
      actorRole: 'operator',
      action: 'Resolved alert',
      target: alert.message,
      reason,
    })
  })
  return updated
}

export async function markSensorFaulty(input: {
  placeId: string
  bayId: string
  operator: User
  reason: string
}): Promise<void> {
  await delay(340)
  mutateDB((draft) => {
    const bay = draft.bays.find((candidate) => candidate.id === input.bayId)
    const sensor = draft.sensors.find((candidate) => candidate.bayId === input.bayId)
    if (!bay || !sensor) throw new Error('Bay or sensor not found.')
    sensor.status = 'offline'
    sensor.confidence = 0
    sensor.lastSeen = new Date().toISOString()
    bay.status = 'unknown'
    bay.confidence = 0
    draft.alerts.unshift({
      id: uid('alert'),
      placeId: input.placeId,
      type: 'sensor_offline',
      severity: 'critical',
      status: 'open',
      message: `Bay ${bay.label} was marked faulty by an operator. Sensor readings are suspended.`,
      bayId: bay.id,
      createdAt: new Date().toISOString(),
    })
    appendAudit(draft, {
      actorId: input.operator.id,
      actorName: input.operator.name,
      actorRole: 'operator',
      action: 'Marked sensor faulty',
      target: `Bay ${bay.label}`,
      reason: input.reason,
    })
  })
}

export async function openTicket(input: {
  placeId: string
  operator: User
  message: string
  bayId?: string
}): Promise<Alert> {
  await delay(280)
  const alert: Alert = {
    id: uid('alert'),
    placeId: input.placeId,
    type: 'ticket',
    severity: 'warning',
    status: 'open',
    message: input.message,
    bayId: input.bayId,
    createdAt: new Date().toISOString(),
  }
  mutateDB((draft) => {
    draft.alerts.unshift(alert)
    appendAudit(draft, {
      actorId: input.operator.id,
      actorName: input.operator.name,
      actorRole: 'operator',
      action: 'Opened operator ticket',
      target: input.message,
      reason: 'Manual operator follow-up',
    })
  })
  return alert
}

export async function reassignReservation(input: {
  reservationId: string
  bayId: string
  operator: User
  reason: string
}): Promise<void> {
  await delay(340)
  mutateDB((draft) => {
    const reservation = draft.reservations.find((candidate) => candidate.id === input.reservationId)
    const newBay = draft.bays.find((candidate) => candidate.id === input.bayId)
    if (!reservation || !newBay) throw new Error('Reservation or target bay not found.')
    if (newBay.status !== 'free') throw new Error('Choose a free target bay.')
    const oldBay = draft.bays.find((candidate) => candidate.id === reservation.bayId)
    if (oldBay) oldBay.status = 'free'
    newBay.status = 'reserved'
    reservation.bayId = newBay.id
    reservation.level = newBay.level
    reservation.row = newBay.row
    reservation.side = newBay.side
    appendAudit(draft, {
      actorId: input.operator.id,
      actorName: input.operator.name,
      actorRole: 'operator',
      action: 'Reassigned reservation bay',
      target: `${reservation.id} · ${newBay.label}`,
      reason: input.reason,
    })
  })
}
