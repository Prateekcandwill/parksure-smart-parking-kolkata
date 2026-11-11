import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ConsentState {
  /** Optional, privacy-friendly usage analytics. Off until the visitor opts in. */
  analytics: boolean
  /** ISO timestamp of the latest choice. `null` shows the consent banner again. */
  decidedAt: string | null
  acceptAll: () => void
  essentialOnly: () => void
  setAnalytics: (enabled: boolean) => void
  reopen: () => void
  reset: () => void
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      analytics: false,
      decidedAt: null,
      acceptAll: () => set({ analytics: true, decidedAt: new Date().toISOString() }),
      essentialOnly: () => set({ analytics: false, decidedAt: new Date().toISOString() }),
      setAnalytics: (enabled) => set({ analytics: enabled, decidedAt: new Date().toISOString() }),
      reopen: () => set({ decidedAt: null }),
      reset: () => set({ analytics: false, decidedAt: null }),
    }),
    {
      name: 'parksure.consent.v1',
      partialize: (state) => ({ analytics: state.analytics, decidedAt: state.decidedAt }),
    },
  ),
)

/** Read consent outside React (used by the analytics helper). */
export function hasAnalyticsConsent(): boolean {
  return useConsentStore.getState().analytics
}
