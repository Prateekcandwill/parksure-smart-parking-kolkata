import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ExpandableRowProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
  className?: string
  onOpenChange?: (open: boolean) => void
}

export function ExpandableRow({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
  badge,
  className,
  onOpenChange,
}: ExpandableRowProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  const toggle = () => {
    setOpen((value) => {
      onOpenChange?.(!value)
      return !value
    })
  }

  return (
    <div className={cn('overflow-hidden', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className="focus-ring flex min-h-14 w-full items-center gap-3 px-1 py-3 text-left"
      >
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/80 bg-raised text-accent">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">{title}</span>
            {badge}
          </span>
          {subtitle ? <span className="mt-0.5 block text-xs leading-relaxed text-muted">{subtitle}</span> : null}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-1 pr-1 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
