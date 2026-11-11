import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'dark' | 'light'
export type Language = 'en' | 'bn' | 'hi'

interface UIState {
  theme: Theme
  language: Language
  simulationOn: boolean
  selectedPlaceId: string
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setLanguage: (language: Language) => void
  setSimulation: (enabled: boolean) => void
  setSelectedPlace: (placeId: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      language: 'en',
      simulationOn: true,
      selectedPlaceId: 'central',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setLanguage: (language) => set({ language }),
      setSimulation: (enabled) => set({ simulationOn: enabled }),
      setSelectedPlace: (placeId) => set({ selectedPlaceId: placeId }),
    }),
    {
      name: 'parksure.ui.v1',
    },
  ),
)
