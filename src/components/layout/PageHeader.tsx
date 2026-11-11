import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  back?: boolean
  className?: string
}

export function PageHeader({ eyebrow, title, description, action, back = false, className }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className={cn('mb-5', className)}>
      {back ? (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="focus-ring -ml-2 mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-muted transition-colors hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="label-caps">{eyebrow}</span>
            </div>
          ) : null}
          <h1 className="font-display text-[2rem] font-semibold leading-[1.05] tracking-tighter2 text-text sm:text-[2.5rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted sm:text-sm">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 sm:pt-1">{action}</div> : null}
      </div>
    </div>
  )
}
