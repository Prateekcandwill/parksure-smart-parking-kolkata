import { useCallback } from 'react'
import { useUIStore } from '@/store/ui'
import { translate } from '@/i18n/strings'

export function useT() {
  const language = useUIStore((state) => state.language)
  return useCallback(
    (key: string, fallback?: string) => translate(language, key, fallback),
    [language],
  )
}
