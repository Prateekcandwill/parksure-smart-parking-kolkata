import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import type { Role } from '@/types'
import { BottomNav, TopBar } from '@/components/layout/Navigation'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SupportAssistant } from '@/components/support/SupportAssistant'
import { useIdleLogout } from '@/hooks/useIdleLogout'
import { useSimulation } from '@/hooks/useSimulation'

export function AppShell({ role }: { role: Role }) {
  useIdleLogout()
  useSimulation()

  useEffect(() => {
    document.documentElement.dataset.accent = role === 'operator' ? 'violet' : 'gold'
  }, [role])

  return (
    <div className="min-h-dvh overflow-x-clip">
      <a
        href="#main"
        className="focus-ring fixed left-3 top-3 z-[100] -translate-y-24 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-ink transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <TopBar role={role} />
      <main id="main" className="mx-auto w-full min-w-0 max-w-4xl px-4 pb-10 pt-5 sm:px-6 sm:pt-7">
        <Outlet />
      </main>
      <SiteFooter role={role} className="pb-[calc(7.5rem+env(safe-area-inset-bottom))]" />
      <BottomNav role={role} />
      <SupportAssistant role={role} />
    </div>
  )
}
