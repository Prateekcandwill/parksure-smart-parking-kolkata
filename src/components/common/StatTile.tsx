import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type StatTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

const toneClasses: Record<StatTone, string> = {
  default: 'text-muted',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

interface StatTileProps {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: StatTone
  className?: string
}

export function StatTile({ label, value, hint, icon, tone = 'default', className }: StatTileProps) {
  return (
    <div className={cn('rounded-2xl border border-line/80 bg-raised/40 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">{label}</span>
        {icon ? <span className={cn('shrink-0', toneClasses[tone])}>{icon}</span> : null}
      </div>
      <div className="mt-2 font-display text-[1.55rem] font-semibold leading-none tracking-tight text-text">
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[11px] leading-relaxed text-muted">{hint}</div> : null}
    </div>
  )
}
