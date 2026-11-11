import { useEffect, useState } from 'react'

export function useDelayedReady(delay = 360): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])

  return ready
}
