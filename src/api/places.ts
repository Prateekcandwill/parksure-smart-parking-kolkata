import type { Bay, Place, Sensor } from '@/types'
import { getDB } from '@/api/db'
import { getDynamicPricing } from '@/utils/pricing'

export interface PlaceSummary extends Place {
  freeBays: number
  occupiedBays: number
  occupancyPercent: number
  /** The administrator-configured hourly rate before demand pricing. */
  basePricePerHour: number
  /** Occupancy + peak-hour multiplier applied to the base rate. */
  demandMultiplier: number
  pricingLabel: string
  pricingReason: string
  isPeak: boolean
  isSurge: boolean
  isDiscount: boolean
}

export function getPlaceSummary(place: Place): PlaceSummary {
  const db = getDB()
  const bays = db.bays.filter((bay) => bay.placeId === place.id)
  const freeBays = place.cameraOnly
    ? (place.estimatedFree ?? 0)
    : bays.filter((bay) => bay.status === 'free' && bay.confidence >= db.settings.thresholds.free).length
  const occupiedBays = place.cameraOnly
    ? Math.max(0, (place.estimatedTotal ?? place.totalBays) - (place.estimatedFree ?? 0))
    : bays.filter((bay) => bay.status !== 'free').length
  const occupancyPercent = Math.round((occupiedBays / Math.max(1, place.totalBays)) * 100)
  const pricing = getDynamicPricing(place, occupancyPercent, db.settings.thresholds.pricing)
  return {
    ...place,
    freeBays,
    occupiedBays,
    occupancyPercent,
    ...pricing,
    pricePerHour: pricing.effectivePricePerHour,
  }
}

export function listPlaces(includeInactive = false): PlaceSummary[] {
  return getDB()
    .places.filter((place) => includeInactive || place.active)
    .map(getPlaceSummary)
}

export function getPlace(placeId: string): PlaceSummary | undefined {
  const place = getDB().places.find((candidate) => candidate.id === placeId)
  return place ? getPlaceSummary(place) : undefined
}

export function getBays(placeId: string): Bay[] {
  return getDB()
    .bays.filter((bay) => bay.placeId === placeId)
    .sort(
      (a, b) =>
        a.level - b.level ||
        a.row.localeCompare(b.row) ||
        a.label.localeCompare(b.label, undefined, { numeric: true }),
    )
}

export function getSensorsForPlace(placeId: string): Sensor[] {
  return getDB().sensors.filter((sensor) => sensor.placeId === placeId)
}

export function getSensor(sensorId: string): Sensor | undefined {
  return getDB().sensors.find((sensor) => sensor.id === sensorId)
}

export function getBay(bayId: string): Bay | undefined {
  return getDB().bays.find((bay) => bay.id === bayId)
}

export function getBestFreeBay(placeId: string): Bay | undefined {
  const db = getDB()
  const activeReservationBayIds = new Set(
    db.reservations
      .filter(
        (reservation) =>
          reservation.placeId === placeId &&
          (reservation.status === 'active' || reservation.status === 'upcoming'),
      )
      .map((reservation) => reservation.bayId),
  )
  return getBays(placeId)
    .filter(
      (bay) =>
        bay.status === 'free' &&
        bay.confidence >= db.settings.thresholds.reservationLock &&
        !activeReservationBayIds.has(bay.id),
    )
    .sort((a, b) => b.confidence - a.confidence)[0]
}

export function getPlaceQueue(placeId: string): number {
  return getDB().gateEvents.filter(
    (event) => event.placeId === placeId && event.status === 'pending',
  ).length
}

export function getRevenueToday(placeId: string): number {
  const db = getDB()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const reservationPaymentIds = new Set(
    db.reservations
      .filter((reservation) => reservation.placeId === placeId)
      .map((reservation) => reservation.paymentId),
  )
  const cashPaymentIds = new Set(
    db.payments
      .filter(
        (payment) =>
          payment.method === 'cash' &&
          payment.status === 'success' &&
          db.shifts.some((shift) => shift.id === payment.shiftId && shift.placeId === placeId),
      )
      .map((payment) => payment.id),
  )
  return db.payments
    .filter(
      (payment) =>
        payment.status === 'success' &&
        payment.kind === 'payment' &&
        new Date(payment.createdAt).getTime() >= start.getTime() &&
        (reservationPaymentIds.has(payment.id) || cashPaymentIds.has(payment.id)),
    )
    .reduce((sum, payment) => sum + payment.amount, 0)
}
