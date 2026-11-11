import type { Bay, ConfidenceThresholds, Payment, Reservation, Sensor } from '@/types'

export interface FusionFactor {
  label: string
  value: string
  weight: 'high' | 'medium' | 'low'
}

export interface FusionResult {
  status: Bay['status']
  confidence: number
  summary: string
  factors: FusionFactor[]
}

export function computeFusion(
  bay: Bay,
  sensor: Sensor | undefined,
  reservation: Reservation | undefined,
  payment: Payment | undefined,
  thresholds: ConfidenceThresholds,
): FusionResult {
  const factors: FusionFactor[] = []
  let confidence = bay.confidence

  if (!sensor) {
    factors.push({ label: 'Magnetometer', value: 'No sensor record', weight: 'high' })
    return {
      status: 'unknown',
      confidence: 0,
      summary: 'No sensor is attached to this bay. A manual check is needed.',
      factors,
    }
  }

  factors.push({
    label: 'Magnetometer',
    value: sensor.status === 'online' ? `${sensor.occupiedReading ? 'Occupied' : 'Free'} reading` : `Sensor ${sensor.status.replace('_', ' ')}`,
    weight: sensor.status === 'online' ? 'high' : 'low',
  })

  if (sensor.status === 'offline') {
    factors.push({ label: 'Fusion', value: 'Sensor unavailable', weight: 'high' })
    return {
      status: 'unknown',
      confidence: Math.min(20, sensor.confidence),
      summary: 'The sensor is offline. Last known state is shown for guidance only.',
      factors,
    }
  }

  if (reservation && reservation.status !== 'cancelled' && reservation.status !== 'completed') {
    factors.push({ label: 'Reservation lock', value: 'Active hold', weight: 'high' })
    confidence = Math.max(confidence, thresholds.reservationLock + 8)
    factors.push({
      label: 'Payment',
      value: payment?.status === 'success' ? 'Cleared online' : 'Not cleared',
      weight: 'medium',
    })
    return {
      status: 'reserved',
      confidence: Math.min(99, confidence),
      summary: 'A paid reservation currently holds this bay.',
      factors,
    }
  }

  factors.push({ label: 'Reservation lock', value: 'None', weight: 'low' })

  if (sensor.status === 'low_battery') {
    factors.push({ label: 'Sensor health', value: 'Low battery', weight: 'medium' })
    confidence = Math.min(confidence, thresholds.lowConfidence + 6)
  }

  if (bay.status === 'unknown' || confidence < thresholds.lowConfidence) {
    factors.push({ label: 'Fusion', value: 'Below confidence floor', weight: 'high' })
    return {
      status: 'unknown',
      confidence,
      summary: 'Readings are below the confidence floor. Treat this bay as unknown.',
      factors,
    }
  }

  factors.push({ label: 'Fusion', value: bay.status === 'occupied' ? 'Occupied' : 'Free', weight: 'high' })
  return {
    status: bay.status,
    confidence,
    summary:
      bay.status === 'occupied'
        ? 'The magnetometer and reservation ledger agree that this bay is occupied.'
        : 'The magnetometer and reservation ledger agree that this bay is free.',
    factors,
  }
}
