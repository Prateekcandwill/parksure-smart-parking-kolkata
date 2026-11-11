import { useEffect, useMemo, useState } from 'react'
import { CircleHelp, Square } from 'lucide-react'
import type { Bay } from '@/types'
import { useDB } from '@/api/useDB'
import { getBays, getPlace } from '@/api/places'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ConfidenceBadge, StatusBadge, bayLabel, bayTone } from '@/components/ui/StatusBadge'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'

interface BayMapProps {
  placeId: string
  selectedBayId?: string | null
  onSelectBay?: (bay: Bay) => void
  className?: string
}

function BayMark({ status }: { status: Bay['status'] }) {
  if (status === 'occupied') return <Square className="h-3 w-3 fill-current" aria-hidden="true" />
  if (status === 'reserved') {
    return <span className="pattern-reserved h-3 w-3 rounded-[3px] border border-current" aria-hidden="true" />
  }
  if (status === 'unknown') return <CircleHelp className="h-3 w-3" aria-hidden="true" />
  return (
    <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-current" aria-hidden="true">
      <span className="h-1 w-1 rounded-full bg-current" />
    </span>
  )
}

const tileTones: Record<Bay['status'], string> = {
  free: 'border-success/30 bg-success/8 text-success hover:border-success/55',
  occupied: 'border-danger/25 bg-danger/8 text-danger',
  reserved: 'border-warning/30 bg-warning/8 text-warning',
  unknown: 'border-muted/25 bg-muted/8 text-muted',
}

export function BayMap({ placeId, selectedBayId, onSelectBay, className }: BayMapProps) {
  const db = useDB()
  const place = getPlace(placeId)
  const bays = getBays(placeId)
  const levels = useMemo(() => [...new Set(bays.map((bay) => bay.level))].sort((a, b) => a - b), [bays])
  const [level, setLevel] = useState(String(levels[0] ?? 1))

  useEffect(() => {
    setLevel(String(levels[0] ?? 1))
  }, [levels, placeId])

  if (!place) return null

  if (place.cameraOnly) {
    return (
      <div className={cn('surface-card p-5', className)}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="label-caps">Camera estimate</div>
            <div className="mt-1 font-display text-lg font-semibold text-text">Unmarked open ground</div>
          </div>
          <ConfidenceBadge confidence={place.confidence} />
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1.5" aria-hidden="true">
          {Array.from({ length: 30 }).map((_, index) => {
            const free = index < (place.estimatedFree ?? 0)
            return (
              <div
                key={index}
                className={cn(
                  'aspect-square rounded-md border',
                  free ? 'border-success/30 bg-success/12' : 'border-danger/20 bg-danger/8',
                )}
              />
            )
          })}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {place.estimatedFree} of {place.estimatedTotal ?? place.totalBays} spaces estimated free. No individual
          bay can be booked here; an attendant directs you on site.
        </p>
      </div>
    )
  }

  const visible = bays.filter((bay) => bay.level === Number(level))
  const rows = [...new Set(visible.map((bay) => bay.row))].sort()

  return (
    <div className={cn('surface-card p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label-caps">Live bay map</div>
          <div className="mt-1 text-sm font-semibold text-text">
            {place.name} · {formatCurrency(place.pricePerHour)}/hr
          </div>
        </div>
        <div className="text-right text-[11px] text-muted">
          <div className="font-mono text-base font-semibold text-text">{place.freeBays}</div>
          free bays
        </div>
      </div>

      {levels.length > 1 ? (
        <SegmentedControl
          className="mt-4"
          ariaLabel="Choose parking level"
          value={level}
          onChange={setLevel}
          options={levels.map((item) => ({ value: String(item), label: `Level ${item}` }))}
        />
      ) : null}

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row} className="flex items-center gap-2">
            <span className="w-5 shrink-0 font-mono text-[11px] font-semibold text-muted" aria-hidden="true">
              {row}
            </span>
            <div className="grid flex-1 grid-cols-4 gap-1.5 sm:grid-cols-6">
              {visible
                .filter((bay) => bay.row === row)
                .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
                .map((bay) => {
                  const selected = selectedBayId === bay.id
                  const interactive = Boolean(onSelectBay)
                  return (
                    <button
                      key={bay.id}
                      type="button"
                      disabled={!interactive}
                      onClick={() => onSelectBay?.(bay)}
                      aria-pressed={selected || undefined}
                      aria-label={`Bay ${bay.label}, ${bayLabel(bay.status)}, ${bay.confidence}% confidence`}
                      className={cn(
                        'focus-ring relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-semibold transition-colors',
                        tileTones[bay.status],
                        selected && 'ring-2 ring-accent ring-offset-2 ring-offset-surface',
                        interactive ? 'cursor-pointer' : 'cursor-default',
                      )}
                    >
                      <BayMark status={bay.status} />
                      <span className="font-mono">{bay.label}</span>
                      <span className="text-[9px] font-medium opacity-70">{bay.confidence}%</span>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/70 pt-3">
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-success text-success">
            <span className="h-1 w-1 rounded-full bg-success" />
          </span>
          Free
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <Square className="h-3 w-3 fill-danger text-danger" aria-hidden="true" />
          Occupied
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <span className="pattern-reserved h-3 w-3 rounded-[3px] border border-warning text-warning" />
          Reserved
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <CircleHelp className="h-3 w-3 text-muted" aria-hidden="true" />
          Unknown
        </span>
        {selectedBayId ? (
          <StatusBadge
            className="ml-auto"
            tone={bayTone(bays.find((bay) => bay.id === selectedBayId)?.status ?? 'unknown')}
            label={`Selected ${bays.find((bay) => bay.id === selectedBayId)?.label ?? ''}`}
          />
        ) : null}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        Simulated magnetometer readings with confidence. A bay below the administrator&apos;s floor is shown as
        unknown and cannot be booked.
      </p>
      <span className="sr-only">{db.bays.length} bays in the demo database</span>
    </div>
  )
}
