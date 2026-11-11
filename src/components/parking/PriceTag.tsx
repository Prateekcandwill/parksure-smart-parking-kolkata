import { Moon, TrendingUp } from 'lucide-react'
import type { PlaceSummary } from '@/api/places'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'

interface PriceTagProps {
  place: Pick<
    PlaceSummary,
    'pricePerHour' | 'basePricePerHour' | 'pricingLabel' | 'pricingReason' | 'isSurge' | 'isDiscount'
  >
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: { price: 'text-base', unit: 'text-[10px]', base: 'text-[10px]' },
  md: { price: 'text-xl', unit: 'text-[11px]', base: 'text-[11px]' },
  lg: { price: 'text-[2rem]', unit: 'text-xs', base: 'text-xs' },
}

export function PriceTag({ place, size = 'md', className }: PriceTagProps) {
  const classes = sizeClasses[size]
  const adjusted = place.isSurge || place.isDiscount
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('numeric font-semibold tracking-tight text-text', classes.price)}>
        {formatCurrency(place.pricePerHour)}
      </span>
      <span className={cn('text-muted', classes.unit)}>per hour</span>
      {adjusted ? (
        <span className={cn('text-muted/75 line-through', classes.base)}>
          {formatCurrency(place.basePricePerHour)}
        </span>
      ) : null}
    </div>
  )
}

export function DemandBadge({
  place,
  className,
  withReason = false,
}: {
  place: Pick<
    PlaceSummary,
    'pricingLabel' | 'pricingReason' | 'isSurge' | 'isDiscount' | 'isPeak'
  >
  className?: string
  withReason?: boolean
}) {
  if (!place.isSurge && !place.isDiscount) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-line/70 bg-raised/60 px-2 py-0.5 text-[9px] font-semibold text-muted',
          className,
        )}
      >
        {place.pricingLabel}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold',
        place.isSurge
          ? 'border-warning/30 bg-warning/10 text-warning'
          : 'border-info/30 bg-info/10 text-info',
        className,
      )}
      title={withReason ? place.pricingReason : undefined}
    >
      {place.isSurge ? (
        <TrendingUp className="h-2.5 w-2.5" aria-hidden="true" />
      ) : (
        <Moon className="h-2.5 w-2.5" aria-hidden="true" />
      )}
      {place.pricingLabel}
    </span>
  )
}
