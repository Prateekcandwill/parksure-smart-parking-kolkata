import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  CircleHelp,
  Info,
  OctagonAlert,
  Square,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import type { BayStatus } from '@/types'

export type StatusTone =
  | 'free'
  | 'occupied'
  | 'reserved'
  | 'unknown'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'pending'

const toneClasses: Record<StatusTone, string> = {
  free: 'border-success/30 bg-success/10 text-success',
  occupied: 'border-danger/30 bg-danger/10 text-danger',
  reserved: 'border-warning/35 bg-warning/10 text-warning',
  unknown: 'border-muted/30 bg-muted/10 text-muted',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/35 bg-warning/10 text-warning',
  danger: 'border-danger/35 bg-danger/10 text-danger',
  info: 'border-info/30 bg-info/10 text-info',
  neutral: 'border-line/90 bg-raised text-muted',
  pending: 'border-info/30 bg-info/10 text-info',
}

function Shape({ tone }: { tone: StatusTone }) {
  const className = 'h-3 w-3 shrink-0'
  if (tone === 'free' || tone === 'success') {
    return tone === 'success' ? (
      <CheckCircle2 className={className} aria-hidden="true" />
    ) : (
      <span className={cn(className, 'relative flex items-center justify-center')} aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full border-2 border-current" />
        <span className="absolute h-1 w-1 rounded-full bg-current" />
      </span>
    )
  }
  if (tone === 'occupied') return <Square className={cn(className, 'fill-current')} aria-hidden="true" />
  if (tone === 'reserved') {
    return (
      <span
        className={cn(className, 'pattern-reserved rounded-[3px] border border-current')}
        aria-hidden="true"
      />
    )
  }
  if (tone === 'unknown') return <CircleHelp className={className} aria-hidden="true" />
  if (tone === 'warning' || tone === 'pending') {
    return tone === 'pending' ? (
      <CircleDot className={className} aria-hidden="true" />
    ) : (
      <AlertTriangle className={className} aria-hidden="true" />
    )
  }
  if (tone === 'danger') return <OctagonAlert className={className} aria-hidden="true" />
  if (tone === 'info') return <Info className={className} aria-hidden="true" />
  return <CircleDot className={className} aria-hidden="true" />
}

interface StatusBadgeProps {
  tone: StatusTone
  label: string
  size?: 'sm' | 'md'
  icon?: ReactNode
  className?: string
}

export function StatusBadge({ tone, label, size = 'sm', icon, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        toneClasses[tone],
        size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
        className,
      )}
    >
      {icon ?? <Shape tone={tone} />}
      <span>{label}</span>
    </span>
  )
}

export function bayTone(status: BayStatus): StatusTone {
  return status
}

export function bayLabel(status: BayStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function ConfidenceBadge({
  confidence,
  size = 'sm',
  className,
}: {
  confidence: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const tone: StatusTone = confidence >= 85 ? 'success' : confidence >= 65 ? 'warning' : 'unknown'
  return (
    <StatusBadge
      tone={tone}
      size={size}
      label={`${confidence}% confidence`}
      className={className}
      icon={
        <span className="flex items-end gap-[2px]" aria-hidden="true">
          {[4, 6, 8, 10].map((height, index) => (
            <span
              key={height}
              className="w-[2px] rounded-full bg-current"
              style={{
                height,
                opacity: confidence >= index * 25 + 15 ? 1 : 0.22,
              }}
            />
          ))}
        </span>
      }
    />
  )
}
