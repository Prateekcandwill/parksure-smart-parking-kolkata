import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { haptic } from '@/utils/haptics'

interface SlideToPayProps {
  label: string
  onConfirm: () => void
  disabled?: boolean
  disabledReason?: string
  loading?: boolean
  className?: string
}

export function SlideToPay({
  label,
  onConfirm,
  disabled = false,
  disabledReason,
  loading = false,
  className,
}: SlideToPayProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [maxX, setMaxX] = useState(0)
  const [x, setX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [triggered, setTriggered] = useState(false)
  const startOffset = useRef(0)
  const blocked = disabled || loading || triggered

  useEffect(() => {
    const element = trackRef.current
    if (!element) return
    const measure = () => setMaxX(Math.max(0, element.clientWidth - 64))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered || loading) return
    const timer = window.setTimeout(() => {
      setTriggered(false)
      setX(0)
    }, 1400)
    return () => window.clearTimeout(timer)
  }, [loading, triggered])

  const trigger = () => {
    if (blocked || maxX <= 0) return
    setTriggered(true)
    setX(maxX)
    haptic('success')
    onConfirm()
  }

  const finishDrag = () => {
    if (!dragging) return
    setDragging(false)
    if (x >= maxX * 0.78) trigger()
    else setX(0)
  }

  const progress = maxX > 0 ? Math.min(1, x / maxX) : 0

  return (
    <div className={className}>
      <div
        ref={trackRef}
        className={cn(
          'relative h-16 select-none overflow-hidden rounded-[22px] border border-line/90 bg-ink/55 shadow-[inset_0_2px_8px_rgba(0,0,0,.35)]',
          disabled && 'opacity-50',
        )}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/12 via-accent/20 to-accent/30"
          style={{ width: x + 64 }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-center">
          <span className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-text/90">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
                Processing…
              </>
            ) : triggered ? (
              <>
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
                Confirmed
              </>
            ) : (
              <>
                {label}
                <ArrowRight className="h-4 w-4 text-accent" aria-hidden="true" />
              </>
            )}
          </span>
        </div>
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label}. Slide right, or press Enter to confirm.`}
          aria-disabled={blocked || undefined}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              trigger()
            }
          }}
          onPointerDown={(event) => {
            if (blocked) return
            setDragging(true)
            startOffset.current = event.clientX - x
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (!dragging || blocked) return
            setX(Math.max(0, Math.min(maxX, event.clientX - startOffset.current)))
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            finishDrag()
          }}
          onPointerCancel={() => {
            setDragging(false)
            setX(0)
          }}
          className={cn(
            'focus-ring absolute left-1 top-1 flex h-14 w-14 touch-none items-center justify-center rounded-[18px] border border-white/15 bg-accent text-accent-ink shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_8px_24px_-8px_rgb(var(--accent)/.75)]',
            !dragging && 'transition-transform duration-300 ease-out',
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
          )}
          style={{ transform: `translate3d(${x}px, 0, 0)` }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : triggered ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : (
            <span className="flex items-center gap-0.5" aria-hidden="true">
              <ArrowRight className="h-5 w-5" />
              <ArrowRight className="-ml-2.5 h-5 w-5 opacity-45" />
            </span>
          )}
        </div>
        <div
          className="absolute bottom-1.5 left-0 h-0.5 rounded-full bg-accent/80 transition-[width]"
          style={{ width: `${progress * 100}%` }}
          aria-hidden="true"
        />
      </div>
      {disabledReason ? (
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-warning">{disabledReason}</p>
      ) : null}
    </div>
  )
}
