import { Link } from 'react-router-dom'
import { Mail, Phone, ShieldCheck } from 'lucide-react'
import type { Role } from '@/types'
import { DEMO_CONFIG } from '@/config/env'
import { cn } from '@/utils/cn'

interface SiteFooterProps {
  role?: Role
  className?: string
}

/** Captured once per app load so render stays pure and the year never goes stale mid-session. */
const COPYRIGHT_YEAR = new Date().getFullYear()

/**
 * Shared footer for every surface. Links are real routes, the support email
 * and phone are tappable, and the copyright year is computed at render time so
 * it never goes stale.
 */
export function SiteFooter({ role, className }: SiteFooterProps) {
  const supportHref = role ? `/${role}/support` : '/sign-in'

  return (
    <footer
      className={cn(
        'mx-auto w-full max-w-4xl px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-8 sm:px-6',
        className,
      )}
    >
      <div className="hairline mb-4" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            Demo mode: simulated data
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={`mailto:${DEMO_CONFIG.supportEmail}`}
              className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg font-semibold hover:text-text"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-all">{DEMO_CONFIG.supportEmail}</span>
            </a>
            <a
              href={`tel:${DEMO_CONFIG.supportPhone}`}
              className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-lg font-semibold hover:text-text"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {DEMO_CONFIG.supportPhoneDisplay}
            </a>
          </div>
        </div>

        <nav aria-label="Footer links" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold">
          <Link to="/privacy" className="focus-ring inline-flex min-h-10 items-center rounded-lg text-muted hover:text-text">
            Privacy
          </Link>
          <Link to="/terms" className="focus-ring inline-flex min-h-10 items-center rounded-lg text-muted hover:text-text">
            Terms
          </Link>
          <Link to={supportHref} className="focus-ring inline-flex min-h-10 items-center rounded-lg text-muted hover:text-text">
            Support
          </Link>
        </nav>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        © {COPYRIGHT_YEAR} ParkSure. Map data © OpenStreetMap contributors. Prices, availability and receipts are
        illustrative.
      </p>
    </footer>
  )
}
