import { Link } from 'react-router-dom'
import { ArrowLeft, Compass, Home, LogIn } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ROLE_META } from '@/utils/roles'
import { Logo } from '@/components/brand/Logo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DemoBadge } from '@/components/ui/DemoBadge'

export default function NotFoundPage() {
  const user = useCurrentUser()
  const userId = useAuthStore((state) => state.userId)
  const activeRole = useAuthStore((state) => state.activeRole)

  const home = user && activeRole ? ROLE_META[activeRole].home : null

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="safe-top mx-auto flex w-full max-w-4xl items-center justify-between px-5 pt-5 sm:px-8">
        <Link to="/" className="focus-ring rounded-xl" aria-label="ParkSure home">
          <Logo />
        </Link>
        <DemoBadge />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16 pt-10 sm:px-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="label-caps">404 · Off the map</span>
        </div>
        <h1 className="font-display text-[2.6rem] font-semibold leading-[1.02] tracking-tighter2 text-text">
          This bay does
          <br />
          not exist.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The page you asked for is not part of this demo. Head back to a workspace and the simulation will pick up
          where it left off.
        </p>

        <Card strong className="mt-6 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <div className="text-sm font-semibold text-text">Suggested next step</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {home
                  ? `Continue in your ${activeRole ? ROLE_META[activeRole].label : ''} workspace.`
                  : userId
                    ? 'Choose a workspace to continue.'
                    : 'Sign in with a demo account to explore all four roles.'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {home ? (
              <Link to={home} className="focus-ring">
                <Button size="lg" className="w-full" iconLeft={<Home className="h-4 w-4" />}>
                  Back to workspace
                </Button>
              </Link>
            ) : (
              <Link to={userId ? '/choose-role' : '/sign-in'} className="focus-ring">
                <Button size="lg" className="w-full" iconLeft={<LogIn className="h-4 w-4" />}>
                  {userId ? 'Choose a workspace' : 'Sign in'}
                </Button>
              </Link>
            )}
            <Link to="/" className="focus-ring">
              <Button size="lg" variant="ghost" className="w-full" iconLeft={<ArrowLeft className="h-4 w-4" />}>
                Start from the beginning
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <SiteFooter className="max-w-md px-5 pt-2 sm:px-6" />
    </div>
  )
}
