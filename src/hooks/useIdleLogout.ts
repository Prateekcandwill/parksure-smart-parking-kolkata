import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'

export function useIdleLogout(): void {
  const navigate = useNavigate()
  const activeRole = useAuthStore((state) => state.activeRole)
  const userId = useAuthStore((state) => state.userId)
  const lastActivity = useRef(Date.now())
  const lastTouch = useRef(0)
  const warned = useRef(false)

  useEffect(() => {
    if (!userId) return
    lastActivity.current = Date.now()
    warned.current = false

    const markActive = () => {
      lastActivity.current = Date.now()
      const now = Date.now()
      if (now - lastTouch.current > 30_000) {
        lastTouch.current = now
        useAuthStore.getState().touch()
      }
    }

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }))
    document.addEventListener('visibilitychange', markActive)

    const timeout = activeRole === 'admin' ? 10 * 60_000 : 30 * 60_000
    const interval = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current
      if (idle >= timeout) {
        window.clearInterval(interval)
        useAuthStore.getState().signOut()
        toast({
          tone: 'info',
          title: 'Signed out after inactivity',
          message: activeRole === 'admin' ? 'Administrator sessions lock after 10 minutes.' : 'Sessions lock after 30 minutes of inactivity.',
        })
        navigate('/sign-in', { replace: true })
        return
      }
      if (!warned.current && timeout - idle <= 60_000) {
        warned.current = true
        toast({
          tone: 'warning',
          title: 'Still there?',
          message: 'You will be signed out in about a minute. Tap or press a key to stay signed in.',
          duration: 9000,
        })
      }
    }, 15_000)

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActive))
      document.removeEventListener('visibilitychange', markActive)
      window.clearInterval(interval)
    }
  }, [activeRole, navigate, userId])
}
