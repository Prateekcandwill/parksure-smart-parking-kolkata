import { FlaskConical, Radio } from 'lucide-react'
import { cn } from '@/utils/cn'

export function DemoBadge({ className, live = false }: { className?: string; live?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-raised/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted',
        className,
      )}
    >
      {live ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
      ) : (
        <FlaskConical className="h-3 w-3" aria-hidden="true" />
      )}
      {live ? 'Simulated live' : 'Demo'}
    </span>
  )
}

export function SimulatedDataNote({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-[11px] leading-relaxed text-muted', className)}>
      <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Sensors, cameras, gates, maps and payments are simulated in this demo.
    </p>
  )
}
