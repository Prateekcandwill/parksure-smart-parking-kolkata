import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { Role } from '@/types'

export function ProtectedRoute({ role }: { role: Role }) {
  const userId = useAuthStore((state) => state.userId)
  const activeRole = useAuthStore((state) => state.activeRole)
  const user = useCurrentUser()
  const location = useLocation()

  if (!userId || !user) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }
  if (!activeRole) {
    return <Navigate to="/choose-role" replace />
  }
  if (activeRole !== role || !user.roles.includes(role)) {
    return <Navigate to="/choose-role" replace />
  }
  return <Outlet />
}
