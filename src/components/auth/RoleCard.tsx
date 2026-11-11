import { Link } from 'react-router-dom'
import {
  Car,
  ChevronRight,
  LayoutDashboard,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
import type { Role } from '@/types'
import { ROLE_META } from '@/utils/roles'
import { cn } from '@/utils/cn'
import { haptic } from '@/utils/haptics'

export const roleIcons = {
  driver: Car,
  attendant: ScanLine,
  operator: LayoutDashboard,
  admin: ShieldCheck,
} satisfies Record<Role, typeof Car>

interface RoleCardProps {
  role: Role
  unlocked: boolean
  onSelect: (role: Role) => void
}

export function RoleCard({ role, unlocked, onSelect }: RoleCardProps) {
  const meta = ROLE_META[role]
  const Icon = roleIcons[role]

  return (
    <button
      type="button"
      disabled={!unlocked}
      onClick={() => {
        if (!unlocked) return
        haptic('tap')
        onSelect(role)
      }}
      className={cn(
        'surface-card focus-ring group relative min-h-[158px] w-full overflow-hidden p-5 text-left transition-all duration-300',
        unlocked
          ? 'pressable hover:border-accent/30 hover:bg-raised/70'
          : 'cursor-not-allowed border-line/60 opacity-55',
      )}
    >
      <div
        className={cn(
          'absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl',
          unlocked ? 'bg-accent/10' : 'bg-muted/5',
        )}
        aria-hidden="true"
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl border',
              unlocked
                ? 'border-accent/25 bg-accent/10 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,.08)]'
                : 'border-line bg-raised text-muted',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {unlocked ? (
            <ChevronRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
              <LockKeyhole className="h-3 w-3" aria-hidden="true" />
              Locked
            </span>
          )}
        </div>
        <div className="mt-4">
          <div className="font-display text-lg font-semibold tracking-tight text-text">{meta.label}</div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{meta.description}</p>
        </div>
        <div className="mt-auto pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted/80">Unlocks</div>
          <div className="mt-1 text-[11px] leading-relaxed text-text/75">
            {unlocked ? meta.unlocks : 'Ask your administrator for access'}
          </div>
        </div>
      </div>
    </button>
  )
}

export function RolePill({ role }: { role: Role }) {
  const Icon = roleIcons[role]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {ROLE_META[role].short}
    </span>
  )
}

export function HomeLink({ role, className }: { role: Role; className?: string }) {
  return (
    <Link to={ROLE_META[role].home} className={className}>
      Home
    </Link>
  )
}
