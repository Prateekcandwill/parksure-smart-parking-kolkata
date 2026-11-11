import type { BayStatus, GateDirection } from '@/types'
import { mutateDB } from '@/api/db'
import { uid } from '@/utils/id'

const plates = [
  'WB 06 AB 1201',
  'WB 02 TT 8812',
  'WB 24 KL 4408',
  'WB 06 XY 7710',
  'WB 02 QQ 5521',
  'WB 24 MN 9932',
  'WB 06 CD 1104',
  'WB 02 GH 6607',
]

const alertMessages = [
  { type: 'low_confidence' as const, severity: 'warning' as const, text: 'Fusion confidence dipped below the alert floor.' },
  { type: 'low_battery' as const, severity: 'warning' as const, text: 'Sensor battery is falling quickly.' },
  { type: 'gate_jam' as const, severity: 'critical' as const, text: 'Gate barrier held open longer than expected.' },
  { type: 'payment' as const, severity: 'info' as const, text: 'Payment gateway response is slower than usual.' },
]

export function simulateTick(): void {
  mutateDB((draft) => {
    const places = draft.places.filter((place) => place.active && !place.cameraOnly)
    if (places.length === 0) return
    const place = places[Math.floor(Math.random() * places.length)]
    const bays = draft.bays.filter((bay) => bay.placeId === place.id)
    const bay = bays[Math.floor(Math.random() * bays.length)]
    if (!bay) return

    const hasHold = draft.reservations.some(
      (reservation) =>
        reservation.bayId === bay.id &&
        (reservation.status === 'active' || reservation.status === 'upcoming'),
    )

    if (!hasHold && bay.status !== 'unknown') {
      const statuses: BayStatus[] = ['free', 'occupied', 'occupied', 'free']
      const nextStatus = statuses[Math.floor(Math.random() * statuses.length)]
      bay.status = nextStatus
      bay.confidence = Math.max(72, Math.min(99, 78 + Math.floor(Math.random() * 21)))
      bay.lastSeen = new Date().toISOString()
      const sensor = draft.sensors.find((candidate) => candidate.id === bay.sensorId)
      if (sensor && sensor.status === 'online') {
        sensor.occupiedReading = nextStatus === 'occupied'
        sensor.confidence = bay.confidence
        sensor.lastSeen = bay.lastSeen
      }
    }

    if (Math.random() < 0.18) {
      const template = alertMessages[Math.floor(Math.random() * alertMessages.length)]
      const openCount = draft.alerts.filter((alert) => alert.status === 'open').length
      if (openCount < 12) {
        draft.alerts.unshift({
          id: uid('alert'),
          placeId: place.id,
          type: template.type,
          severity: template.severity,
          status: 'open',
          message: `${place.name} · Bay ${bay.label}: ${template.text}`,
          bayId: bay.id,
          createdAt: new Date().toISOString(),
        })
      }
    }

    if (Math.random() < 0.22) {
      const pendingCount = draft.gateEvents.filter((event) => event.status === 'pending').length
      if (pendingCount < 10) {
        const direction: GateDirection = Math.random() > 0.45 ? 'entry' : 'exit'
        const read = plates[Math.floor(Math.random() * plates.length)]
        const mismatch = Math.random() < 0.25
        draft.gateEvents.unshift({
          id: uid('gate'),
          placeId: place.id,
          direction,
          plateRead: read,
          plateExpected: mismatch ? read.slice(0, -1) + String((Number(read.slice(-1)) + 1) % 10) : read,
          confidence: 84 + Math.floor(Math.random() * 15),
          at: new Date().toISOString(),
          status: 'pending',
          paymentDue: direction === 'exit' ? 40 + Math.floor(Math.random() * 9) * 10 : undefined,
          prebooked: direction === 'exit' && Math.random() < 0.2,
        })
      }
    }

    draft.places = draft.places.map((candidate) => {
      if (candidate.cameraOnly) {
        if (candidate.id === place.id) {
          const estimate = Math.max(3, Math.min((candidate.estimatedTotal ?? 30) - 2, (candidate.estimatedFree ?? 18) + (Math.random() > 0.5 ? 1 : -1)))
          return { ...candidate, estimatedFree: estimate, confidence: 58 + Math.floor(Math.random() * 9) }
        }
        return candidate
      }
      const placeBays = draft.bays.filter((candidateBay) => candidateBay.placeId === candidate.id)
      const average =
        placeBays.length > 0
          ? Math.round(placeBays.reduce((sum, candidateBay) => sum + candidateBay.confidence, 0) / placeBays.length)
          : candidate.confidence
      return { ...candidate, confidence: average }
    })
  })
}
