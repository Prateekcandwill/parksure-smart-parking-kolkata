/**
 * Lightweight, privacy-friendly bot and abuse protection.
 *
 * The demo has no server, so this cannot stop a determined attacker. It does
 * stop accidental double submits and simple scripted form spam without adding
 * a third-party CAPTCHA or collecting personal data. Production deployments
 * should pair this with server-side rate limiting and a real bot challenge.
 */

const STORAGE_KEY = 'parksure.abuse.v1'

type AttemptLog = Record<string, number[]>

function readLog(): AttemptLog {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as AttemptLog
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLog(log: AttemptLog): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Best-effort only.
  }
}

export interface RateLimitResult {
  allowed: boolean
  retryInSeconds: number
}

export function checkRateLimit(action: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const attempts = (readLog()[action] ?? []).filter((at) => now - at < windowMs)
  if (attempts.length >= limit) {
    const oldest = attempts[0] ?? now
    return {
      allowed: false,
      retryInSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
    }
  }
  return { allowed: true, retryInSeconds: 0 }
}

export function recordAttempt(action: string, windowMs = 60_000): void {
  const now = Date.now()
  const log = readLog()
  const attempts = (log[action] ?? []).filter((at) => now - at < windowMs)
  log[action] = [...attempts, now].slice(-40)
  writeLog(log)
}

export function resetAttempts(action?: string): void {
  if (!action) {
    writeLog({})
    return
  }
  const log = readLog()
  delete log[action]
  writeLog(log)
}

/** Returns true when a hidden honeypot field was filled by a bot. */
export function honeypotTripped(value: string): boolean {
  return value.trim().length > 0
}
