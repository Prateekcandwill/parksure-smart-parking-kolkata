import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface Step {
  label: string
  description?: string
  icon?: ReactNode
  status?: 'complete' | 'current' | 'upcoming'
}

interface StepperProps {
  steps: Step[]
  className?: string
  compact?: boolean
}

export function Stepper({ steps, className, compact = false }: StepperProps) {
  return (
    <ol className={cn('relative space-y-0', className)} aria-label="Progress">
      {steps.map((step, index) => {
        const status = step.status ?? 'upcoming'
        const last = index === steps.length - 1
        return (
          <li key={`${step.label}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span
                className={cn(
                  'absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px',
                  status === 'complete' ? 'bg-accent/45' : 'bg-line',
                )}
                aria-hidden="true"
              />
            ) : null}
            <div
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                status === 'complete' && 'border-accent/35 bg-accent text-accent-ink',
                status === 'current' && 'border-accent/50 bg-accent/12 text-accent shadow-[0_0_0_4px_rgb(var(--accent)/.08)]',
                status === 'upcoming' && 'border-line bg-surface text-muted',
              )}
            >
              {status === 'complete' ? <Check className="h-4 w-4" aria-hidden="true" /> : step.icon ?? index + 1}
            </div>
            <div className={cn('min-w-0 pt-0.5', compact && 'pt-1')}>
              <div
                className={cn(
                  'text-sm font-semibold',
                  status === 'current' ? 'text-text' : status === 'complete' ? 'text-text/85' : 'text-muted',
                )}
              >
                {step.label}
              </div>
              {step.description ? (
                <div className="mt-0.5 text-xs leading-relaxed text-muted">{step.description}</div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
