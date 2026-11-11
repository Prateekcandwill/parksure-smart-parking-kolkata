import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface ChipProps {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  className?: string
  icon?: ReactNode
  ariaLabel?: string
  disabled?: boolean
}

export function Chip({ active = false, children, onClick, className, icon, ariaLabel, disabled }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        'focus-ring pressable inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors',
        active
          ? 'border-accent/35 bg-accent/12 text-accent'
          : 'border-line/85 bg-surface/70 text-muted hover:border-muted/45 hover:text-text',
        disabled && 'opacity-40',
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

interface ChipRowProps {
  children: ReactNode
  className?: string
  label?: string
}

export function ChipRow({ children, className, label }: ChipRowProps) {
  return (
    <div
      className={cn('flex flex-wrap gap-2 pb-1', className)}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  )
}
