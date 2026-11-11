import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Building2,
  Camera,
  CircleParking,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  SquareParking,
  Trees,
} from 'lucide-react'
import type { PlaceSummary } from '@/api/places'
import { listPlaces } from '@/api/places'
import { useDB } from '@/api/useDB'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useDelayedReady } from '@/hooks/useDelayedReady'
import { useT } from '@/i18n/useT'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceSwitcher } from '@/components/layout/PlaceSwitcher'
import { PlaceMap } from '@/components/map/PlaceMap'
import { DemandBadge, PriceTag } from '@/components/parking/PriceTag'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TextField } from '@/components/ui/Input'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { ConfidenceBadge, StatusBadge } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/utils/format'
import { openExternal, osmDirectionsUrl } from '@/utils/navigation'
import { haptic } from '@/utils/haptics'
import { cn } from '@/utils/cn'

type SortKey = 'nearest' | 'free' | 'cheap'
type FilterKey = 'all' | 'covered' | 'ev' | 'camera'
type ViewKey = 'list' | 'map'

function PlaceIcon({ place, className }: { place: PlaceSummary; className?: string }) {
  const Icon = place.kind === 'multistory' ? Building2 : place.kind === 'surface' ? SquareParking : Trees
  return <Icon className={className} aria-hidden="true" />
}

function matchesFilter(place: PlaceSummary, filter: FilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'camera') return place.cameraOnly
  if (filter === 'covered') return place.kind === 'multistory'
  return place.features.some((feature) => /ev|charging/i.test(feature))
}

function sortPlaces(places: PlaceSummary[], sort: SortKey): PlaceSummary[] {
  return [...places].sort((a, b) => {
    if (sort === 'nearest') return a.distanceKm - b.distanceKm
    if (sort === 'free') return b.freeBays - a.freeBays
    return a.pricePerHour - b.pricePerHour
  })
}

function AvailabilityBar({ place }: { place: PlaceSummary }) {
  const tight = place.freeBays <= 2
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-text">
          {place.freeBays} of {place.totalBays} free
        </span>
        <span className={cn('text-[10px] font-semibold', tight ? 'text-warning' : 'text-success')}>
          {tight ? 'Filling fast' : 'Good availability'}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/60" aria-hidden="true">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', tight ? 'bg-warning' : 'bg-success')}
          style={{ width: `${Math.max(4, 100 - place.occupancyPercent)}%` }}
        />
      </div>
    </div>
  )
}

export default function FindPage() {
  const db = useDB()
  const user = useCurrentUser()
  const t = useT()
  const ready = useDelayedReady(360)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('nearest')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<ViewKey>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const places = useMemo(() => {
    const all = listPlaces()
    const needle = query.trim().toLowerCase()
    return sortPlaces(
      all.filter((place) => {
        if (!matchesFilter(place, filter)) return false
        if (!needle) return true
        return (
          place.name.toLowerCase().includes(needle) ||
          place.address.toLowerCase().includes(needle) ||
          place.features.some((feature) => feature.toLowerCase().includes(needle))
        )
      }),
      sort,
    )
  }, [db, filter, query, sort])

  const selected = places.find((place) => place.id === selectedId) ?? places[0]
  const firstName = user?.name.split(' ')[0] ?? 'there'

  const navigateTo = (place: PlaceSummary) => {
    haptic('tap')
    openExternal(osmDirectionsUrl(place))
  }

  if (!ready) {
    return (
      <>
        <PageHeader
          eyebrow="Kolkata · Driver"
          title={`Where to, ${firstName}?`}
          description="Live bay availability from simulated sensors and cameras."
          action={<DemoBadge live />}
        />
        <PageSkeleton cards={4} />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Kolkata · Driver"
        title={`Where to, ${firstName}?`}
        description="Park Street to Salt Lake, with live availability, honest hourly rates and turn-by-turn directions."
        action={<DemoBadge live />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <PlaceSwitcher />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/70 px-3 py-1.5 text-[10px] font-semibold text-muted">
          <CircleParking className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          {places.length} places shown
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-[10px] font-semibold text-accent">
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          Kolkata
        </span>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <TextField
            label="Search parking"
            placeholder="Area, landmark or feature"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            icon={<Search className="h-4 w-4" />}
            trailing={
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-muted">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </span>
            }
            autoComplete="off"
          />
          <div className="mt-4">
            <SegmentedControl
              ariaLabel="Sort parking places"
              value={sort}
              onChange={(next) => {
                haptic('tap')
                setSort(next)
              }}
              options={[
                { value: 'nearest', label: t('driver.sortNearest') },
                { value: 'free', label: t('driver.sortFree') },
                { value: 'cheap', label: t('driver.sortCheap') },
              ]}
            />
          </div>
          <ChipRow className="mt-3" label="Parking filters">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </Chip>
            <Chip active={filter === 'covered'} onClick={() => setFilter('covered')}>
              Covered
            </Chip>
            <Chip active={filter === 'ev'} onClick={() => setFilter('ev')}>
              EV nearby
            </Chip>
            <Chip active={filter === 'camera'} onClick={() => setFilter('camera')}>
              Camera only
            </Chip>
          </ChipRow>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
            <span className="text-[11px] text-muted">Live demand pricing updates with occupancy and peak hours.</span>
            <SegmentedControl
              className="w-auto shrink-0"
              ariaLabel="Choose parking view"
              value={view}
              onChange={(next) => {
                haptic('tap')
                setView(next)
              }}
              options={[
                { value: 'list', label: t('driver.viewList') },
                { value: 'map', label: t('driver.viewMap') },
              ]}
            />
          </div>
        </Card>

        {places.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search className="h-6 w-6" aria-hidden="true" />}
              title="No places match"
              body="Try a different Kolkata area or clear the filters. The demo has four seeded places."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setFilter('all')
                  }}
                  className="focus-ring min-h-12 w-full rounded-2xl border border-line/80 bg-raised text-sm font-semibold text-text"
                >
                  Clear filters
                </button>
              }
            />
          </Card>
        ) : view === 'map' ? (
          <div className="space-y-3">
            <PlaceMap
              places={places}
              selectedId={selected?.id}
              onSelect={(placeId) => {
                haptic('tap')
                setSelectedId(placeId)
              }}
              heightClass="h-[360px] sm:h-[430px]"
            />
            {selected ? (
              <Card strong className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                    <PlaceIcon place={selected} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold tracking-tight text-text">{selected.name}</h2>
                      <DemandBadge place={selected} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                      {selected.address}
                    </p>
                  </div>
                  <PriceTag place={selected} size="sm" className="shrink-0 flex-col items-end gap-0" />
                </div>
                <div className="mt-3 flex items-center gap-4 rounded-2xl border border-line/70 bg-ink/25 p-3">
                  <ProgressRing
                    value={selected.occupancyPercent}
                    label={`${selected.occupancyPercent}% occupied`}
                  />
                  <AvailabilityBar place={selected} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link to={`/driver/place/${selected.id}`} className={buttonClasses('primary', 'md', 'w-full')}>
                    View & book
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigateTo(selected)}
                    className={buttonClasses('secondary', 'md', 'w-full')}
                  >
                    <Navigation className="h-4 w-4" aria-hidden="true" />
                    {t('driver.navigate')}
                  </button>
                </div>
              </Card>
            ) : null}
            <p className="px-1 text-[10px] leading-relaxed text-muted">
              Tap a pin to compare live bays and pricing. Navigate opens OpenStreetMap with driving directions in a
              new tab; the embedded preview uses the same OpenStreetMap data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {places.map((place) => {
              return (
                <Card key={place.id} className="p-4 transition-colors hover:border-accent/30 sm:p-5">
                  <Link
                    to={`/driver/place/${place.id}`}
                    className="focus-ring block rounded-2xl"
                    aria-label={`${place.name}, ${place.freeBays} of ${place.totalBays} bays free, ${formatCurrency(place.pricePerHour)} per hour`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
                        <PlaceIcon place={place} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate font-display text-lg font-semibold tracking-tight text-text">
                                {place.name}
                              </h2>
                              {place.cameraOnly ? <StatusBadge tone="warning" label="Camera estimate" /> : null}
                            </div>
                            <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] text-muted">
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                              {place.address}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <PriceTag place={place} size="sm" className="flex-col items-end gap-0" />
                            <div className="mt-0.5 text-[10px] text-muted">{place.distanceKm.toFixed(1)} km away</div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <DemandBadge place={place} />
                          <span className="text-[10px] text-muted">{place.kind}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-4 rounded-2xl border border-line/70 bg-ink/25 p-3">
                      <ProgressRing value={place.occupancyPercent} label={`${place.occupancyPercent}% occupied`} />
                      <AvailabilityBar place={place} />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {place.features.slice(0, 3).map((feature) => (
                          <span
                            key={feature}
                            className="rounded-full border border-line/70 bg-raised/50 px-2.5 py-1 text-[10px] font-medium text-muted"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                    </div>
                  </Link>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                    <ConfidenceBadge confidence={place.confidence} />
                    <div className="flex items-center gap-2">
                      {place.cameraOnly ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted">
                          <Camera className="h-3 w-3" aria-hidden="true" />
                          No bay booking
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => navigateTo(place)}
                        className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line/80 bg-raised px-3 text-[11px] font-semibold text-text transition-colors hover:border-accent/35 hover:text-accent"
                      >
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('driver.navigate')}
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <p className="px-1 pb-2 text-[10px] leading-relaxed text-muted">
          Availability combines magnetometer readings with reservation locks. Demand pricing starts at the
          administrator&apos;s pricing floor and rises during peak hours. {db.bays.length} simulated bays across the
          Kolkata demo network.
        </p>
      </div>
    </div>
  )
}
