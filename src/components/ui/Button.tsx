import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'ghost' | 'secondary' | 'danger' | 'quiet'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'glove' | 'icon'

const base =
  'focus-ring relative inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-45'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/.32),0_16px_42px_-20px_rgb(var(--accent)/.8)] hover:brightness-[1.04] active:brightness-[.97]',
  ghost:
    'border border-line/90 bg-transparent text-text hover:border-muted/50 hover:bg-raised/70',
  secondary:
    'border border-line/80 bg-raised text-text shadow-inset hover:bg-raised/80 hover:border-muted/40',
  danger:
    'border border-danger/35 bg-danger/10 text-danger hover:bg-danger/15',
  quiet:
    'bg-transparent text-muted hover:bg-raised hover:text-text',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 text-[13px]',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-6 text-[15px]',
  glove: 'min-h-[72px] min-w-[72px] px-6 text-base rounded-[22px]',
  icon: 'h-12 w-12 p-0',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], 'pressable', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(base, variants[variant], sizes[size], 'pressable', className)
}
