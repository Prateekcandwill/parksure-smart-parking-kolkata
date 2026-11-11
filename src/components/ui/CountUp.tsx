import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface CountUpProps {
  value: number
  format?: (value: number) => string
  duration?: number
  className?: string
}

export function CountUp({ value, format = (input) => String(Math.round(input)), duration = 720, className }: CountUpProps) {
  const reduceMotion = useReducedMotion()
  const [display, setDisplay] = useState(reduceMotion ? value : 0)
  const previous = useRef(0)

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value)
      previous.current = value
      return
    }
    const from = previous.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (value - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else previous.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, reduceMotion, value])

  return <span className={className}>{format(display)}</span>
}
