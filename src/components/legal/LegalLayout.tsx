import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { DEMO_CONFIG } from '@/config/env'

interface LegalLayoutProps {
  title: string
  updated: string
  summary: string
  children: ReactNode
}

export function LegalLayout({ title, updated, summary, children }: LegalLayoutProps) {
  return (
    <div className="relative min-h-dvh">
      <a
        href="#legal-main"
        className="focus-ring fixed left-3 top-3 z-[100] -translate-y-24 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="safe-top sticky top-0 z-30">
        <div className="glass border-b border-line/70">
          <div className="mx-auto flex h-[66px] w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
            <Link to="/" className="focus-ring flex items-center gap-2.5 rounded-xl" aria-label="ParkSure home">
              <Logo size={34} showWordmark={false} />
              <span className="font-display text-[1.12rem] font-semibold tracking-tighter2 text-text">
                Park<span className="text-accent">Sure</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <DemoBadge />
              <Link
                to="/sign-in"
                className="focus-ring inline-flex min-h-10 items-center rounded-xl border border-line/80 bg-raised px-3 text-[11px] font-semibold text-text hover:border-accent/35"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main id="legal-main" className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8 sm:px-6 sm:pt-10">
        <Link
          to="/"
          className="focus-ring mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-xl text-xs font-semibold text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to ParkSure
        </Link>

        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="label-caps">Legal</span>
        </div>
        <h1 className="font-display text-[2.2rem] font-semibold leading-[1.04] tracking-tighter2 text-text sm:text-[2.7rem]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{summary}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line/80 bg-raised/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Last updated {updated}
        </p>

        <div className="mt-8 space-y-7 text-[13px] leading-relaxed text-muted [&_a]:font-semibold [&_a]:text-accent [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-text [&_li]:mt-1.5 [&_strong]:text-text [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>

        <div className="mt-10 rounded-2xl border border-accent/20 bg-accent/8 p-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-text">Questions?</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                This is a demonstration project, not a live parking operator. For questions about this policy or the
                terms, email{' '}
                <a href={`mailto:${DEMO_CONFIG.supportEmail}`} className="font-semibold text-accent underline-offset-4 hover:underline">
                  {DEMO_CONFIG.supportEmail}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter className="max-w-3xl px-5 pt-2 sm:px-6" />
    </div>
  )
}
