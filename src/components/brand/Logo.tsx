import { cn } from '@/utils/cn'

interface LogoProps {
  size?: number
  showWordmark?: boolean
  className?: string
  wordmarkClassName?: string
}

export function Logo({ size = 40, showWordmark = true, className, wordmarkClassName }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className="relative shrink-0 overflow-hidden rounded-[30%] shadow-[0_10px_30px_-12px_rgb(var(--accent)/.65)]"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" width={size} height={size} role="presentation">
          <defs>
            <linearGradient id="parkSureMark" x1="8" y1="4" x2="42" y2="46" gradientUnits="userSpaceOnUse">
              <stop stopColor="rgb(244, 215, 145)" />
              <stop offset="0.52" stopColor="rgb(232, 194, 106)" />
              <stop offset="1" stopColor="rgb(174, 128, 41)" />
            </linearGradient>
            <linearGradient id="parkSureGloss" x1="10" y1="6" x2="32" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" stopOpacity=".5" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="15" fill="url(#parkSureMark)" />
          <rect width="48" height="24" rx="15" fill="url(#parkSureGloss)" />
          <path
            d="M16.5 35.5V13.5h9.2c5.1 0 8.3 2.8 8.3 7.2 0 4.5-3.2 7.3-8.3 7.3h-4.3v7.5h-4.9Zm4.9-12.1h3.8c2.3 0 3.8-1.1 3.8-2.7 0-1.7-1.5-2.7-3.8-2.7h-3.8v5.4Z"
            fill="#17130A"
          />
          <circle cx="36" cy="12" r="2.2" fill="#17130A" fillOpacity=".22" />
        </svg>
      </div>
      {showWordmark ? (
        <div className={cn('leading-none', wordmarkClassName)}>
          <div className="font-display text-[1.35rem] font-semibold tracking-tighter2 text-text">
            Park<span className="text-accent">Sure</span>
          </div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
            Smart parking
          </div>
        </div>
      ) : null}
    </div>
  )
}
