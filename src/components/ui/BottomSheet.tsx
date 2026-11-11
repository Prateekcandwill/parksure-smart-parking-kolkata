import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'full'
  hideClose?: boolean
  className?: string
}

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
  className,
}: BottomSheetProps) {
  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(focusableSelector)
      ;(first ?? panelRef.current)?.focus()
    }, 80)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      )
      if (focusable.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(timer)
      previousFocus.current?.focus()
    }
  }, [onClose, open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-label="Close sheet"
            tabIndex={-1}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
            aria-describedby={description ? 'sheet-description' : undefined}
            tabIndex={-1}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.42 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 850) onClose()
            }}
            initial={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.7 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%', opacity: 0.7 }}
            transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 320, damping: 34 }}
            className={cn(
              'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[30px] border border-line/90 bg-[rgb(var(--sheet))] shadow-[0_-24px_90px_-20px_rgba(0,0,0,.9)] sm:rounded-[30px]',
              size === 'md' && 'sm:max-w-lg',
              size === 'lg' && 'sm:max-w-2xl',
              size === 'full' && 'h-[92dvh] sm:max-w-3xl',
              className,
            )}
          >
            <div
              className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-3 active:cursor-grabbing"
              onPointerDown={(event) => dragControls.start(event)}
              aria-hidden="true"
            >
              <div className="h-1.5 w-11 rounded-full bg-line" />
            </div>
            {title ? (
              <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-2 sm:px-6">
                <div className="min-w-0">
                  <h2 id="sheet-title" className="font-display text-xl font-semibold tracking-tight text-text">
                    {title}
                  </h2>
                  {description ? (
                    <p id="sheet-description" className="mt-1 text-xs leading-relaxed text-muted">
                      {description}
                    </p>
                  ) : null}
                </div>
                {!hideClose ? (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line/80 bg-raised text-muted transition-colors hover:text-text"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-line/80 bg-[rgb(var(--sheet))] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
