import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { haptic } from '@/utils/haptics'

interface ScratchRevealProps {
  children: ReactNode
  onRevealed?: () => void
  className?: string
  label?: string
}

export function ScratchReveal({
  children,
  onRevealed,
  className,
  label = 'Scratch to reveal your bay',
}: ScratchRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const lastPoint = useRef<{ x: number; y: number } | null>(null)
  const moves = useRef(0)
  const revealedRef = useRef(false)
  const [revealed, setRevealed] = useState(false)
  const [progress, setProgress] = useState(0)

  const drawCover = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    const context = canvas.getContext('2d')
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.globalCompositeOperation = 'source-over'

    const gradient = context.createLinearGradient(0, 0, rect.width, rect.height)
    gradient.addColorStop(0, '#302719')
    gradient.addColorStop(0.36, '#7c6230')
    gradient.addColorStop(0.56, '#c8a75d')
    gradient.addColorStop(0.76, '#8e7137')
    gradient.addColorStop(1, '#2a2216')
    context.fillStyle = gradient
    context.fillRect(0, 0, rect.width, rect.height)

    context.strokeStyle = 'rgba(255,255,255,.09)'
    context.lineWidth = 1
    for (let offset = -rect.height; offset < rect.width; offset += 16) {
      context.beginPath()
      context.moveTo(offset, 0)
      context.lineTo(offset + rect.height, rect.height)
      context.stroke()
    }

    context.fillStyle = 'rgba(16,13,8,.78)'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = '600 11px "Space Grotesk", sans-serif'
    context.fillText(label.toUpperCase(), rect.width / 2, rect.height / 2 - 8)
    context.font = '500 10px Inter, sans-serif'
    context.fillStyle = 'rgba(16,13,8,.52)'
    context.fillText('Use your finger or mouse', rect.width / 2, rect.height / 2 + 12)

    const shine = context.createLinearGradient(0, 0, rect.width, 0)
    shine.addColorStop(0, 'rgba(255,255,255,0)')
    shine.addColorStop(0.48, 'rgba(255,255,255,.18)')
    shine.addColorStop(0.52, 'rgba(255,255,255,.18)')
    shine.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = shine
    context.fillRect(0, rect.height * 0.12, rect.width, rect.height * 0.08)
  }, [label])

  useEffect(() => {
    drawCover()
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(drawCover)
    observer.observe(element)
    return () => observer.disconnect()
  }, [drawCover])

  const reveal = () => {
    if (revealedRef.current) return
    revealedRef.current = true
    setRevealed(true)
    setProgress(1)
    haptic('success')
    onRevealed?.()
  }

  const checkProgress = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const image = context.getImageData(0, 0, canvas.width, canvas.height).data
    let clear = 0
    let total = 0
    for (let index = 3; index < image.length; index += 40) {
      total += 1
      if (image[index] < 30) clear += 1
    }
    const ratio = total > 0 ? clear / total : 0
    setProgress(Math.min(1, ratio / 0.42))
    if (ratio > 0.42) reveal()
  }

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || revealedRef.current) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const context = canvas.getContext('2d')
    if (!context) return
    context.globalCompositeOperation = 'destination-out'
    context.beginPath()
    context.arc(x, y, 28, 0, Math.PI * 2)
    context.fill()
    if (lastPoint.current) {
      const previous = lastPoint.current
      const distance = Math.hypot(x - previous.x, y - previous.y)
      const steps = Math.max(1, Math.floor(distance / 12))
      for (let step = 0; step < steps; step += 1) {
        const t = step / steps
        context.beginPath()
        context.arc(previous.x + (x - previous.x) * t, previous.y + (y - previous.y) * t, 27, 0, Math.PI * 2)
        context.fill()
      }
    }
    lastPoint.current = { x, y }
    moves.current += 1
    if (moves.current % 7 === 0) checkProgress()
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative min-h-44 overflow-hidden rounded-[26px] border border-line/80 bg-raised"
      >
        <div aria-live="polite">{children}</div>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full w-full cursor-crosshair touch-none transition-opacity duration-500',
            revealed ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
          onPointerDown={(event) => {
            drawing.current = true
            lastPoint.current = null
            event.currentTarget.setPointerCapture(event.pointerId)
            scratch(event.clientX, event.clientY)
          }}
          onPointerMove={(event) => {
            if (drawing.current) scratch(event.clientX, event.clientY)
          }}
          onPointerUp={(event) => {
            drawing.current = false
            lastPoint.current = null
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            checkProgress()
          }}
          onPointerCancel={() => {
            drawing.current = false
            lastPoint.current = null
          }}
        />
        {!revealed ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-white/55 transition-[width]"
                style={{ width: `${Math.max(4, progress * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
      {!revealed ? (
        <button
          type="button"
          onClick={reveal}
          className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-xs font-semibold text-accent"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Reveal bay without scratching
        </button>
      ) : null}
    </div>
  )
}
