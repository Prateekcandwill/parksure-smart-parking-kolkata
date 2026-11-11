export type HapticKind = 'tap' | 'success' | 'error' | 'warning'

const patterns: Record<HapticKind, number | number[]> = {
  tap: 8,
  success: [12, 45, 18],
  error: [30, 45, 30],
  warning: [18, 35, 18],
}

export function haptic(kind: HapticKind = 'tap'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(patterns[kind])
  } catch {
    // Vibration is a progressive enhancement only.
  }
}
