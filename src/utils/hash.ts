export function hashString(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    h1 ^= code
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= code + index
    h2 = Math.imul(h2, 0x85ebca6b)
    h2 ^= h2 >>> 13
  }

  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  )
}

export function computeAuditHash(
  prevHash: string,
  event: {
    at: string
    actorId: string
    actorRole: string
    action: string
    target: string
    reason?: string
  },
): string {
  return hashString(
    [
      prevHash,
      event.at,
      event.actorId,
      event.actorRole,
      event.action,
      event.target,
      event.reason ?? '',
    ].join('|'),
  )
}
