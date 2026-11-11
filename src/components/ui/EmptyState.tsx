import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-accent/15 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-line/80 bg-raised text-accent shadow-bevel">
          {icon}
        </div>
      </div>
      <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{body}</p>
      {action ? <div className="mt-6 w-full max-w-xs">{action}</div> : null}
    </div>
  )
}
