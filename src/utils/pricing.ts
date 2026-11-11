import type { Place } from '@/types'
import { roundCurrency } from '@/utils/format'

export interface DynamicPricing {
  basePricePerHour: number
  demandMultiplier: number
  effectivePricePerHour: number
  pricingLabel: string
  pricingReason: string
  isPeak: boolean
  isSurge: boolean
  isDiscount: boolean
}

interface KolkataClock {
  day: number
  hour: number
}

/**
 * Kolkata wall-clock time without relying on the device timezone.
 * 0 = Sunday, 6 = Saturday.
 */
function kolkataClock(at: Date): KolkataClock {
  const shifted = new Date(at.getTime() + 5.5 * 60 * 60 * 1000)
  return { day: shifted.getUTCDay(), hour: shifted.getUTCHours() }
}

function occupancyMultiplier(occupancyPercent: number, threshold: number): number {
  if (occupancyPercent >= 90) return 1.35
  if (occupancyPercent >= 75) return 1.2
  if (occupancyPercent >= threshold) return 1.1
  return 1
}

function peakWindow(clock: KolkataClock): { active: boolean; label: string; lift: number } {
  const { day, hour } = clock
  if (day >= 1 && day <= 5) {
    if (hour >= 9 && hour < 12) return { active: true, label: 'weekday office peak', lift: 0.15 }
    if (hour >= 17 && hour < 21) return { active: true, label: 'weekday evening peak', lift: 0.15 }
  }
  if (day === 6 && hour >= 11 && hour < 21) {
    return { active: true, label: 'Saturday leisure peak', lift: 0.1 }
  }
  if (day === 0 && hour >= 16 && hour < 21) {
    return { active: true, label: 'Sunday evening peak', lift: 0.1 }
  }
  return { active: false, label: '', lift: 0 }
}

function formatMultiplier(value: number): string {
  return `${value.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}×`
}

/**
 * Dynamic parking price for a Kolkata lot.
 *
 * The administrator's pricing floor (`settings.thresholds.pricing`) is the
 * occupancy point where demand pricing starts. Peak windows are tuned to
 * Kolkata commute and leisure patterns.
 */
export function getDynamicPricing(
  place: Place,
  occupancyPercent: number,
  threshold = 60,
  at: Date = new Date(),
): DynamicPricing {
  const basePricePerHour = place.pricePerHour
  const clock = kolkataClock(at)
  const peak = peakWindow(clock)
  const night = clock.hour >= 22 || clock.hour < 6

  const raw =
    occupancyMultiplier(occupancyPercent, threshold) +
    (peak.active ? peak.lift : 0) +
    (night ? -0.1 : 0)
  const demandMultiplier = Math.min(1.6, Math.max(0.85, Math.round(raw * 20) / 20))
  const effectivePricePerHour = Math.max(
    5,
    Math.round(roundCurrency(basePricePerHour * demandMultiplier) / 5) * 5,
  )

  const isSurge = demandMultiplier > 1.05
  const isDiscount = demandMultiplier < 0.95
  const occupancyReason =
    occupancyPercent >= threshold
      ? `${occupancyPercent}% occupied`
      : `${occupancyPercent}% occupied · below demand floor`

  const pricingReason = [
    occupancyReason,
    peak.active ? peak.label : night ? 'night window' : 'off-peak',
  ].join(' · ')

  const pricingLabel = isSurge
    ? `${peak.active ? 'Peak demand' : 'High demand'} · ${formatMultiplier(demandMultiplier)}`
    : isDiscount
      ? `Night rate · ${formatMultiplier(demandMultiplier)}`
      : 'Standard rate'

  return {
    basePricePerHour,
    demandMultiplier,
    effectivePricePerHour,
    pricingLabel,
    pricingReason,
    isPeak: peak.active,
    isSurge,
    isDiscount,
  }
}
