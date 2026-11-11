import type { AuditEvent } from '@/types'
import { formatDateTime } from '@/utils/format'

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const lines = [
    headers.map((header) => escapeCsv(header)).join(','),
    ...rows.map((row) => row.map((value) => escapeCsv(String(value))).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadAuditCsv(events: AuditEvent[]): void {
  const headers = [
    'event_id',
    'timestamp',
    'actor_id',
    'actor_name',
    'actor_role',
    'action',
    'target',
    'reason',
    'prev_hash',
    'hash',
  ]

  const rows = events.map((event) => [
    event.id,
    formatDateTime(event.at),
    event.actorId,
    event.actorName,
    event.actorRole,
    event.action,
    event.target,
    event.reason ?? '',
    event.prevHash,
    event.hash,
  ])

  downloadCsv(`parksure-audit-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
}
