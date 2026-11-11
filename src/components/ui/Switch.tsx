import { cn } from '@/utils/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text">{label}</div>
        {description ? <div className="mt-0.5 text-xs leading-relaxed text-muted">{description}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'focus-ring relative flex h-12 w-14 shrink-0 items-center rounded-full border p-1 transition-colors disabled:opacity-40',
          checked ? 'border-accent/40 bg-accent/25' : 'border-line bg-ink/50',
        )}
      >
        <span
          className={cn(
            'h-8 w-8 rounded-full shadow-md transition-transform duration-300',
            checked ? 'translate-x-5 bg-accent' : 'translate-x-0 bg-muted/80',
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  )
}
