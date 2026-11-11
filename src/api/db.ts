import type { AppData } from '@/types'
import { createSeedData } from '@/api/seed'

const STORAGE_KEY = 'parksure.db.v2'
const CURRENT_VERSION = 2

function clone<T>(value: T): T {
  return structuredClone(value)
}

function loadDB(): AppData {
  if (typeof window === 'undefined') return clone(createSeedData())
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seeded = clone(createSeedData())
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw) as AppData
    if (parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.bays)) {
      const seeded = clone(createSeedData())
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
      return seeded
    }
    return parsed
  } catch {
    return clone(createSeedData())
  }
}

let data = loadDB()
const listeners = new Set<() => void>()

function persist(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Persistence is best-effort in demo mode.
  }
}

export function getDB(): AppData {
  return data
}

export function subscribeDB(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function mutateDB(mutator: (draft: AppData) => void): AppData {
  const next = clone(data)
  mutator(next)
  data = next
  persist()
  listeners.forEach((listener) => listener())
  return data
}

export function resetDB(): AppData {
  data = clone(createSeedData())
  persist()
  listeners.forEach((listener) => listener())
  return data
}

export function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      data = JSON.parse(event.newValue) as AppData
      listeners.forEach((listener) => listener())
    } catch {
      // Ignore malformed cross-tab writes.
    }
  })
}
