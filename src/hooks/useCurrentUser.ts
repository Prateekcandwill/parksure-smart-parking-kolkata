import { useDB } from '@/api/useDB'
import { useAuthStore } from '@/store/auth'
import type { User } from '@/types'

export function useCurrentUser(): User | undefined {
  const userId = useAuthStore((state) => state.userId)
  const db = useDB()
  return db.users.find((user) => user.id === userId)
}
