import { create } from 'zustand'
import { uid } from '@/utils/id'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  message?: string
  duration?: number
}

interface ToastState {
  toasts: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => string
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = uid('toast')
    set((state) => ({ toasts: [...state.toasts.slice(-3), { ...toast, id }] }))
    return id
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export function toast(input: Omit<ToastItem, 'id'>): string {
  return useToastStore.getState().push(input)
}
