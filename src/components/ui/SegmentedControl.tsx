import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const id = useId()
  return (
    <div
      className={cn(
        'relative grid rounded-2xl border border-line/85 bg-ink/40 p-1',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-ring relative z-10 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold transition-colors',
              size === 'sm' ? 'text-[11px]' : 'text-xs',
              active ? 'text-text' : 'text-muted hover:text-text',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segment-${id}`}
                className="absolute inset-0 rounded-xl border border-line/90 bg-raised shadow-inset"
                transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                aria-hidden="true"
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
