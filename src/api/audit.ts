import type { AppData, AuditEvent, Role } from '@/types'
import { computeAuditHash } from '@/utils/hash'
import { uid } from '@/utils/id'
import { delay, mutateDB } from '@/api/db'

export interface AuditInput {
  actorId: string
  actorName: string
  actorRole: Role | 'system'
  action: string
  target: string
  reason?: string
}

export function appendAudit(draft: AppData, input: AuditInput): AuditEvent {
  const previous = draft.auditEvents[draft.auditEvents.length - 1]
  const prevHash = previous?.hash ?? 'GENESIS'
  const at = new Date().toISOString()
  const hash = computeAuditHash(prevHash, {
    at,
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    target: input.target,
    reason: input.reason,
  })
  const event: AuditEvent = {
    id: uid('audit'),
    at,
    ...input,
    prevHash,
    hash,
  }
  draft.auditEvents.push(event)
  return event
}

export function verifyAuditChain(events: AuditEvent[]): {
  valid: boolean
  checked: number
  brokenAt?: AuditEvent
} {
  let previousHash = 'GENESIS'
  for (const event of events) {
    const expected = computeAuditHash(previousHash, event)
    if (event.prevHash !== previousHash || event.hash !== expected) {
      return { valid: false, checked: events.indexOf(event), brokenAt: event }
    }
    previousHash = event.hash
  }
  return { valid: true, checked: events.length }
}

export async function verifyAudit(): Promise<ReturnType<typeof verifyAuditChain>> {
  await delay(320)
  let result = verifyAuditChain([])
  mutateDB((draft) => {
    result = verifyAuditChain(draft.auditEvents)
    appendAudit(draft, {
      actorId: 'system',
      actorName: 'Hash-chain verifier',
      actorRole: 'system',
      action: 'Verified audit hash chain',
      target: `${result.checked} events`,
      reason: result.valid ? 'Chain intact' : 'Chain broken',
    })
  })
  return result
}

export async function recordAudit(input: AuditInput): Promise<AuditEvent> {
  await delay(80)
  let result: AuditEvent | undefined
  mutateDB((draft) => {
    result = appendAudit(draft, input)
  })
  return result!
}
