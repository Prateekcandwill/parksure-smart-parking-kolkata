import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (ids: { inputId: string; describedBy?: string }) => ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = error ? errorId : hint ? hintId : undefined
  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={inputId} className="block text-[12px] font-semibold text-muted">
        {label}
      </label>
      {children({ inputId, describedBy })}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  icon?: ReactNode
  trailing?: ReactNode
  containerClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, icon, trailing, className, containerClassName, ...props },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} className={containerClassName}>
      {({ inputId, describedBy }) => (
        <div className="relative">
          {icon ? (
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
              {icon}
            </div>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              'inset-field h-12 w-full rounded-2xl text-sm text-text placeholder:text-muted focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20',
              icon ? 'pl-11' : 'pl-4',
              trailing ? 'pr-12' : 'pr-4',
              error && 'border-danger/60 focus:border-danger/70 focus:ring-danger/15',
              className,
            )}
            {...props}
          />
          {trailing ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
          ) : null}
        </div>
      )}
    </Field>
  )
})

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
  containerClassName?: string
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, hint, error, className, containerClassName, ...props }, ref) {
    return (
      <Field label={label} hint={hint} error={error} className={containerClassName}>
        {({ inputId, describedBy }) => (
          <textarea
            ref={ref}
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              'inset-field min-h-28 w-full resize-none rounded-2xl p-4 text-sm leading-relaxed text-text placeholder:text-muted focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20',
              error && 'border-danger/60',
              className,
            )}
            {...props}
          />
        )}
      </Field>
    )
  },
)
