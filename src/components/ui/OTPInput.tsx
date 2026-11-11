import { useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: string
  autoFocus?: boolean
  label?: string
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  error,
  autoFocus = true,
  label = 'One-time code',
}: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const completed = useRef(false)
  const digits = value.padEnd(length, ' ').slice(0, length).split('')

  useEffect(() => {
    if (autoFocus) {
      const timer = window.setTimeout(() => inputs.current[0]?.focus(), 250)
      return () => window.clearTimeout(timer)
    }
  }, [autoFocus])

  useEffect(() => {
    if (value.length === length && !completed.current) {
      completed.current = true
      onComplete?.(value)
    }
    if (value.length < length) completed.current = false
  }, [length, onComplete, value])

  const setDigit = (index: number, digit: string) => {
    const next = digits.map((item) => (item === ' ' ? '' : item))
    next[index] = digit
    onChange(next.join('').replace(/\s/g, ''))
    if (digit && index < length - 1) inputs.current[index + 1]?.focus()
  }

  return (
    <div>
      <div
        className="grid grid-cols-6 gap-2"
        role="group"
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element
            }}
            value={digits[index]?.trim() ?? ''}
            onChange={(event) => {
              const raw = event.target.value.replace(/\D/g, '')
              if (!raw) {
                setDigit(index, '')
                return
              }
              if (raw.length > 1) {
                const pasted = raw.slice(0, length - index).split('')
                const next = digits.map((item) => (item === ' ' ? '' : item))
                pasted.forEach((digit, offset) => {
                  next[index + offset] = digit
                })
                onChange(next.join('').replace(/\s/g, ''))
                inputs.current[Math.min(length - 1, index + pasted.length)]?.focus()
                return
              }
              setDigit(index, raw)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace') {
                event.preventDefault()
                if (digits[index]?.trim()) {
                  setDigit(index, '')
                } else if (index > 0) {
                  setDigit(index - 1, '')
                  inputs.current[index - 1]?.focus()
                }
              }
              if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
              if (event.key === 'ArrowRight' && index < length - 1) inputs.current[index + 1]?.focus()
            }}
            onPaste={(event) => {
              event.preventDefault()
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
              if (!pasted) return
              onChange(pasted)
              inputs.current[Math.min(length - 1, pasted.length - 1)]?.focus()
            }}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              'inset-field h-14 w-full rounded-2xl text-center font-mono text-xl font-semibold text-text focus:border-accent/65 focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-45',
              error && 'border-danger/60',
            )}
          />
        ))}
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  )
}
