import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore, type ToastItem } from '@/store/toast'
import { cn } from '@/utils/cn'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const toneClasses = {
  success: 'border-success/30 text-success',
  error: 'border-danger/35 text-danger',
  warning: 'border-warning/35 text-warning',
  info: 'border-info/30 text-info',
}

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((state) => state.dismiss)
  const Icon = icons[item.tone]

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), item.duration ?? 4600)
    return () => window.clearTimeout(timer)
  }, [dismiss, item.duration, item.id])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      role={item.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-2xl border bg-[rgb(var(--sheet))]/95 p-3.5 shadow-[0_22px_60px_-20px_rgba(0,0,0,.85)] backdrop-blur-xl',
        toneClasses[item.tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text">{item.title}</div>
        {item.message ? <div className="mt-0.5 text-xs leading-relaxed text-muted">{item.message}</div> : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="focus-ring -m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] mx-auto flex w-full max-w-md flex-col gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  )
}
