import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Logo } from '@/components/brand/Logo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { DemoBadge } from '@/components/ui/DemoBadge'

export function AuthLayout({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    document.documentElement.dataset.accent = 'gold'
  }, [])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(700px 420px at 82% -8%, rgb(var(--accent) / .14), transparent 62%), radial-gradient(620px 420px at -10% 22%, rgb(var(--violet) / .1), transparent 64%)',
        }}
      />
      <header className="safe-top mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-5 sm:px-8">
        <Link to="/" className="focus-ring rounded-xl" aria-label="ParkSure home">
          <Logo />
        </Link>
        <DemoBadge />
      </header>
      <main className="mx-auto w-full max-w-md px-5 pb-12 pt-8 sm:px-6 sm:pt-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {children}
        </motion.div>
      </main>
      <SiteFooter className="max-w-md px-5 pt-2 sm:px-6" />
    </div>
  )
}
