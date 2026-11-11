import { useSyncExternalStore } from 'react'
import type { AppData } from '@/types'
import { getDB, subscribeDB } from '@/api/db'

export function useDB(): AppData {
  return useSyncExternalStore(subscribeDB, getDB, getDB)
}
