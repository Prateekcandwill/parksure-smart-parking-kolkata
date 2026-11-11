import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { RoleCard } from '@/components/auth/RoleCard'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuthStore } from '@/store/auth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { ROLE_META, ROLE_ORDER } from '@/utils/roles'
import { haptic } from '@/utils/haptics'

export default function RoleChooserPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const userId = useAuthStore((state) => state.userId)
  const setRole = useAuthStore((state) => state.setRole)
  const signOut = useAuthStore((state) => state.signOut)

  if (!userId) return <Navigate to="/sign-in" replace />
  if (!user) return <Navigate to="/sign-in" replace />

  const unlocked = ROLE_ORDER.filter((role) => user.roles.includes(role))
  const locked = ROLE_ORDER.filter((role) => !user.roles.includes(role))

  return (
    <AuthLayout>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} tone={user.avatarTone} size="md" />
          <div>
            <div className="text-sm font-semibold text-text">{user.name}</div>
            <div className="text-[11px] text-muted">{user.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            signOut()
            navigate('/sign-in', { replace: true })
          }}
          className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[11px] font-semibold text-muted hover:text-text"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="label-caps">Role chooser</span>
        </div>
        <h1 className="font-display text-[2.15rem] font-semibold leading-[1.03] tracking-tighter2 text-text">
          How are you parking today?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your permissions follow your account. Locked workspaces need an administrator.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {unlocked.map((role) => (
          <RoleCard
            key={role}
            role={role}
            unlocked
            onSelect={(next) => {
              setRole(next)
              haptic('success')
              navigate(ROLE_META[next].home)
            }}
          />
        ))}
      </div>

      {locked.length > 0 ? (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-muted">
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Locked for this account
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {locked.map((role) => (
              <RoleCard key={role} role={role} unlocked={false} onSelect={() => undefined} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line/80 bg-surface/60 p-3.5">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <div className="text-[11px] leading-relaxed text-muted">
          Every workspace is protected by a route guard. Switching roles keeps the same sign-in session but
          changes the visible tools.
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-raised/40 px-3.5 py-3">
        <div>
          <div className="text-[11px] font-semibold text-text">Want to try all four workspaces?</div>
          <div className="mt-0.5 text-[10px] text-muted">Sign in as admin@demo to unlock driver, attendant, operator and admin.</div>
        </div>
        <StatusBadge tone="info" label="Demo" />
      </div>

      <div className="mt-5 text-center">
        <Link to="/sign-in" className="focus-ring inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent">
          Use a different account
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </AuthLayout>
  )
}
