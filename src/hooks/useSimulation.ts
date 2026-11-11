import { useEffect } from 'react'
import { useUIStore } from '@/store/ui'
import { simulateTick } from '@/api/simulation'

export function useSimulation(): void {
  const enabled = useUIStore((state) => state.simulationOn)

  useEffect(() => {
    if (!enabled) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') simulateTick()
    }, 6500)
    return () => window.clearInterval(interval)
  }, [enabled])
}
