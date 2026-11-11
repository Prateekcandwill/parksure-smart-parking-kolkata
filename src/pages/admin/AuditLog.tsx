import { useMemo, useState } from 'react'
import {
  Download,
  Filter,
  Link2,
  ScrollText,
  Search,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'
import type { AuditEvent, Role } from '@/types'
import { useDB } from '@/api/useDB'
import { getAuditEvents } from '@/api/admin'
import { verifyAudit, verifyAuditChain } from '@/api/audit'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ExpandableRow } from '@/components/ui/ExpandableRow'
import { TextField } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatDateTime } from '@/utils/format'
import { downloadAuditCsv } from '@/utils/csv'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'

type ActorFilter = Role | 'system' | 'all'

const actorFilters: Array<{ value: ActorFilter; label: string }> = [
  { value: 'all', label: 'All actors' },
  { value: 'admin', label: 'Admin' },
  { value: 'operator', label: 'Operator' },
  { value: 'attendant', label: 'Attendant' },
  { value: 'driver', label: 'Driver' },
  { value: 'system', label: 'System' },
]

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export default function AuditLogPage() {
  const db = useDB()
  const [actor, setActor] = useState<ActorFilter>('all')
  const [query, setQuery] = useState('')
  const [verifying, setVerifying] = useState(false)

  const events = useMemo(() => getAuditEvents(), [db.auditEvents])
  const chain = useMemo(() => verifyAuditChain(db.auditEvents), [db.auditEvents])

  const visible = events.filter((event) => {
    if (actor !== 'all' && event.actorRole !== actor) return false
    const haystack = `${event.actorName} ${event.actorId} ${event.action} ${event.target} ${event.reason ?? ''}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const actorCount = new Set(events.map((event) => event.actorId)).size
  const systemCount = events.filter((event) => event.actorRole === 'system').length

  const exportCsv = () => {
    downloadAuditCsv(visible)
    haptic('success')
    toast({ tone: 'success', title: 'Audit trail exported', message: `${visible.length} events as CSV` })
  }

  const runVerification = async () => {
    setVerifying(true)
    try {
      const result = await verifyAudit()
      haptic(result.valid ? 'success' : 'error')
      toast({
        tone: result.valid ? 'success' : 'error',
        title: result.valid ? 'Hash chain intact' : 'Hash chain broken',
        message: result.valid
          ? `${result.checked} events verified end to end.`
          : `Mismatch at ${formatDateTime(result.brokenAt?.at ?? new Date())}.`,
      })
    } catch (caught) {
      haptic('error')
      toast({
        tone: 'error',
        title: 'Verification failed',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Log"
        title="Audit trail"
        description="Every privileged action is hash-chained. Verify the chain, filter by actor and export a tamper-evident CSV."
        action={<DemoBadge />}
      />

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <StatTile
          label="Events"
          value={String(events.length)}
          icon={<ScrollText className="h-4 w-4" />}
          tone="accent"
        />
        <StatTile
          label="Actors"
          value={String(actorCount)}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="info"
        />
        <StatTile
          label="System"
          value={String(systemCount)}
          icon={<Link2 className="h-4 w-4" />}
          tone="success"
        />
      </div>

      <Card
        strong
        className={chain.valid ? 'border-success/25 p-5' : 'border-danger/35 p-5'}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={
                chain.valid
                  ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-success/25 bg-success/10 text-success'
                  : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger'
              }
            >
              {chain.valid ? (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              ) : (
                <ShieldX className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  {chain.valid ? 'Chain verified locally' : 'Chain integrity issue'}
                </span>
                <StatusBadge
                  tone={chain.valid ? 'success' : 'danger'}
                  label={chain.valid ? 'Valid' : 'Broken'}
                />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {chain.valid
                  ? `${chain.checked} events link back to the genesis block. Each hash covers the previous hash and the event body.`
                  : `The first mismatch is at ${chain.brokenAt ? formatDateTime(chain.brokenAt.at) : 'an unknown event'}.`}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="lg"
            loading={verifying}
            iconLeft={<ShieldCheck className="h-4 w-4" />}
            onClick={() => void runVerification()}
          >
            Run verification
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">Filter events</h2>
          </div>
          <Button
            size="sm"
            variant="secondary"
            iconLeft={<Download className="h-4 w-4" />}
            onClick={exportCsv}
            disabled={visible.length === 0}
          >
            Export CSV
          </Button>
        </div>
        <TextField
          label="Search"
          placeholder="Actor, action, target or reason"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          icon={<Search className="h-4 w-4" />}
          autoComplete="off"
        />
        <ChipRow label="Filter by actor role" className="mt-3">
          {actorFilters.map((filter) => (
            <Chip
              key={filter.value}
              active={actor === filter.value}
              onClick={() => {
                haptic('tap')
                setActor(filter.value)
              }}
            >
              {filter.label}
            </Chip>
          ))}
        </ChipRow>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ScrollText className="h-6 w-6" aria-hidden="true" />}
            title="No matching events"
            body="Clear the search or choose a different actor. New privileged actions append to this chain immediately."
          />
        </Card>
      ) : (
        <Card className="p-4">
          <div className="mb-1 flex items-center justify-between gap-2 px-1">
            <h2 className="text-sm font-semibold text-text">
              {visible.length} {visible.length === 1 ? 'event' : 'events'}
            </h2>
            <span className="text-[10px] uppercase tracking-[0.1em] text-muted">Newest first</span>
          </div>
          <ul className="divide-y divide-line/60">
            {visible.map((event) => (
              <li key={event.id}>
                <AuditRow event={event} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AuditRow({ event }: { event: AuditEvent }) {
  return (
    <ExpandableRow
      title={event.action}
      subtitle={`${event.actorName} · ${event.target}`}
      icon={<ScrollText className="h-4 w-4" aria-hidden="true" />}
      badge={
        <StatusBadge
          tone={
            event.actorRole === 'admin'
              ? 'warning'
              : event.actorRole === 'operator'
                ? 'info'
                : event.actorRole === 'system'
                  ? 'success'
                  : 'neutral'
          }
          label={event.actorRole}
        />
      }
    >
      <div className="space-y-2 rounded-2xl border border-line/80 bg-ink/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <span>{formatDateTime(event.at)}</span>
          <span className="font-mono">{event.id}</span>
        </div>
        {event.reason ? (
          <div>
            <div className="label-caps">Reason</div>
            <p className="mt-1 text-xs leading-relaxed text-text/85">{event.reason}</p>
          </div>
        ) : null}
        <div className="grid gap-2 border-t border-line/60 pt-2 sm:grid-cols-2">
          <div>
            <div className="label-caps">Previous hash</div>
            <div className="mt-1 break-all font-mono text-[10px] text-muted" title={event.prevHash}>
              {shortHash(event.prevHash)}
            </div>
          </div>
          <div>
            <div className="label-caps">Event hash</div>
            <div className="mt-1 break-all font-mono text-[10px] text-accent" title={event.hash}>
              {shortHash(event.hash)}
            </div>
          </div>
        </div>
      </div>
    </ExpandableRow>
  )
}
