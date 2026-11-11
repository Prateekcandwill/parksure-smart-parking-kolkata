import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeftRight,
  Bell,
  Car,
  Clock3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ScanLine,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { Role } from '@/types'
import { useT } from '@/i18n/useT'
import { cn } from '@/utils/cn'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { Avatar } from '@/components/ui/Avatar'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { RolePill } from '@/components/auth/RoleCard'
import { Logo } from '@/components/brand/Logo'
import { ROLE_META } from '@/utils/roles'

interface Tab {
  to: string
  labelKey: string
  icon: typeof Car
  match: string[]
}

const tabsByRole: Record<Role, Tab[]> = {
  driver: [
    { to: '/driver/find', labelKey: 'nav.find', icon: Search, match: ['/driver/find', '/driver/place', '/driver/book'] },
    { to: '/driver/trip', labelKey: 'nav.trip', icon: Clock3, match: ['/driver/trip'] },
    { to: '/driver/wallet', labelKey: 'nav.wallet', icon: CreditCard, match: ['/driver/wallet'] },
    { to: '/driver/me', labelKey: 'nav.me', icon: UserRound, match: ['/driver/me'] },
  ],
  attendant: [
    { to: '/attendant/gate', labelKey: 'nav.gate', icon: ScanLine, match: ['/attendant/gate'] },
    { to: '/attendant/me', labelKey: 'nav.me', icon: UserRound, match: ['/attendant/me'] },
  ],
  operator: [
    { to: '/operator/lot', labelKey: 'nav.lot', icon: LayoutDashboard, match: ['/operator/lot'] },
    { to: '/operator/alerts', labelKey: 'nav.alerts', icon: Bell, match: ['/operator/alerts'] },
    { to: '/operator/log', labelKey: 'nav.log', icon: ScrollText, match: ['/operator/log'] },
    { to: '/operator/me', labelKey: 'nav.me', icon: UserRound, match: ['/operator/me', '/operator/cash'] },
  ],
  admin: [
    { to: '/admin/settings', labelKey: 'nav.settings', icon: Settings2, match: ['/admin/settings'] },
    { to: '/admin/analytics', labelKey: 'nav.analytics', icon: Activity, match: ['/admin/analytics'] },
    { to: '/admin/log', labelKey: 'nav.log', icon: ShieldCheck, match: ['/admin/log'] },
    { to: '/admin/me', labelKey: 'nav.me', icon: UserRound, match: ['/admin/me'] },
  ],
}

export function BottomNav({ role }: { role: Role }) {
  const tabs = tabsByRole[role]
  const location = useLocation()
  const t = useT()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 bottom-dock">
      <nav
        aria-label="Primary navigation"
        className="glass pointer-events-auto flex w-full max-w-md items-stretch gap-1 rounded-[26px] border border-line/90 p-1.5 shadow-[0_-12px_60px_-28px_rgba(0,0,0,.9)]"
      >
        {tabs.map((tab) => {
          const active = tab.match.some((path) => location.pathname.startsWith(path))
          const Icon = tab.icon
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'focus-ring relative flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[20px] px-2 text-[10px] font-semibold transition-colors',
                active ? 'text-accent' : 'text-muted hover:text-text',
              )}
            >
              {active ? (
                <motion.span
                  layoutId={`nav-active-${role}`}
                  className="absolute inset-0 rounded-[20px] border border-accent/20 bg-accent/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  aria-hidden="true"
                />
              ) : null}
              <Icon className="relative z-10 h-[18px] w-[18px]" aria-hidden="true" />
              <span className="relative z-10">{t(tab.labelKey)}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}

export function TopBar({ role }: { role: Role }) {
  const user = useCurrentUser()
  const home = ROLE_META[role].home
  const navigate = useNavigate()
  const t = useT()
  const signOut = useAuthStore((state) => state.signOut)
  const switchRole = useAuthStore((state) => state.switchRole)
  const [menuOpen, setMenuOpen] = useState(false)

  const rowClass =
    'focus-ring flex min-h-12 items-center gap-3 rounded-xl border border-line/80 bg-raised/40 px-3 text-[13px] font-semibold text-text transition-colors hover:border-accent/35'

  const closeAnd = (action: () => void) => {
    setMenuOpen(false)
    action()
  }

  return (
    <header className="safe-top sticky top-0 z-30">
      <div className="glass border-b border-line/70">
        <div className="mx-auto flex h-[66px] max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to={home} className="focus-ring flex min-w-0 items-center gap-2.5 rounded-xl" aria-label="ParkSure home">
            <Logo size={34} showWordmark={false} />
            <span className="truncate font-display text-[1.12rem] font-semibold tracking-tighter2 text-text">
              Park<span className="text-accent">Sure</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={`/${role}/support`}
              aria-label="Open ParkSure Assist support"
              className="focus-ring hidden h-11 w-11 items-center justify-center rounded-full border border-line/80 bg-raised text-muted transition-colors hover:border-accent/35 hover:text-text sm:flex"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-line/80 bg-raised text-muted transition-colors hover:border-accent/35 hover:text-text"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="hidden sm:inline-flex">
              <RolePill role={role} />
            </span>
            {user ? (
              <Link
                to={`/${role}/me`}
                aria-label={`Open ${user.name}'s profile`}
                className="focus-ring flex h-11 w-11 items-center justify-center rounded-full"
              >
                <Avatar name={user.name} tone={user.avatarTone} size="sm" className="h-10 w-10 border-line" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <BottomSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={t('nav.menu')}
        description={ROLE_META[role].label + ' workspace'}
      >
        <nav aria-label="Workspace menu" className="space-y-2 pb-2">
          <Link to={`/${role}/support`} onClick={() => setMenuOpen(false)} className={rowClass}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-success/25 bg-success/10 text-success">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block">{t('nav.support')}</span>
              <span className="mt-0.5 block text-[10px] font-normal leading-relaxed text-muted">
                On-device ParkSure Assist. No external AI.
              </span>
            </span>
          </Link>

          <Link to="/privacy" onClick={() => setMenuOpen(false)} className={rowClass}>
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {t('nav.privacy')}
          </Link>
          <Link to="/terms" onClick={() => setMenuOpen(false)} className={rowClass}>
            <FileText className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {t('nav.terms')}
          </Link>

          <div className="hairline my-1" />

          <button
            type="button"
            onClick={() => closeAnd(() => {
              switchRole()
              navigate('/choose-role')
            })}
            className={cn(rowClass, 'w-full')}
          >
            <ArrowLeftRight className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            {t('auth.switchRole')}
          </button>
          <button
            type="button"
            onClick={() => closeAnd(() => {
              signOut()
              toast({ tone: 'info', title: 'Signed out', message: 'Your demo data stays in this browser.' })
              navigate('/sign-in', { replace: true })
            })}
            className={cn(rowClass, 'w-full text-danger hover:border-danger/40')}
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t('nav.signOut')}
          </button>
        </nav>
      </BottomSheet>
    </header>
  )
}
