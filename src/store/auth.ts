import { create } from 'zustand'
import type { Role } from '@/types'

const SESSION_KEY = 'parksure.session.v1'

interface StoredSession {
  userId: string
  activeRole: Role | null
  remember: boolean
  lastActivity: number
}

function timeoutFor(role: Role | null): number {
  return role === 'admin' ? 10 * 60_000 : 30 * 60_000
}

function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.userId) return null
    if (Date.now() - parsed.lastActivity > timeoutFor(parsed.activeRole)) {
      window.localStorage.removeItem(SESSION_KEY)
      window.sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeSession(session: StoredSession): void {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(session)
  if (session.remember) {
    window.localStorage.setItem(SESSION_KEY, payload)
    window.sessionStorage.removeItem(SESSION_KEY)
  } else {
    window.sessionStorage.setItem(SESSION_KEY, payload)
    window.localStorage.removeItem(SESSION_KEY)
  }
}

function clearSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
}

interface AuthState {
  userId: string | null
  activeRole: Role | null
  remember: boolean
  lastActivity: number
  signIn: (userId: string, remember: boolean) => void
  setRole: (role: Role) => void
  switchRole: () => void
  signOut: () => void
  touch: () => void
}

const initial = readSession()

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: initial?.userId ?? null,
  activeRole: initial?.activeRole ?? null,
  remember: initial?.remember ?? false,
  lastActivity: initial?.lastActivity ?? Date.now(),
  signIn: (userId, remember) => {
    const lastActivity = Date.now()
    set({ userId, remember, activeRole: null, lastActivity })
    writeSession({ userId, remember, activeRole: null, lastActivity })
  },
  setRole: (role) => {
    const { userId, remember } = get()
    if (!userId) return
    const lastActivity = Date.now()
    set({ activeRole: role, lastActivity })
    writeSession({ userId, remember, activeRole: role, lastActivity })
  },
  switchRole: () => {
    const { userId, remember, lastActivity } = get()
    if (!userId) return
    set({ activeRole: null })
    writeSession({ userId, remember, activeRole: null, lastActivity })
  },
  signOut: () => {
    clearSession()
    set({ userId: null, activeRole: null, remember: false, lastActivity: Date.now() })
  },
  touch: () => {
    set({ lastActivity: Date.now() })
  },
}))
