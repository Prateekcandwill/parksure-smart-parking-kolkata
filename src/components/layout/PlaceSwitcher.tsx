import { useEffect, useState } from 'react'
import { Building2, Check, ChevronDown, MapPin, SquareParking, Trees } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useUIStore } from '@/store/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useDB } from '@/api/useDB'
import { listPlaces, type PlaceSummary } from '@/api/places'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { haptic } from '@/utils/haptics'

function PlaceIcon({ place }: { place: PlaceSummary }) {
  const Icon = place.kind === 'multistory' ? Building2 : place.kind === 'surface' ? SquareParking : Trees
  return <Icon className="h-4 w-4" aria-hidden="true" />
}

export function PlaceSwitcher() {
  useDB()
  const user = useCurrentUser()
  const selectedPlaceId = useUIStore((state) => state.selectedPlaceId)
  const setSelectedPlace = useUIStore((state) => state.setSelectedPlace)
  const [open, setOpen] = useState(false)
  const places = listPlaces()
  const allowed = places.filter(
    (place) => !user || user.roles.includes('admin') || user.placeIds.length === 0 || user.placeIds.includes(place.id),
  )
  const selected = allowed.find((place) => place.id === selectedPlaceId) ?? allowed[0]

  useEffect(() => {
    if (selected && selected.id !== selectedPlaceId) setSelectedPlace(selected.id)
  }, [selected, selectedPlaceId, setSelectedPlace])

  if (!selected) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring pressable inline-flex min-h-12 max-w-full items-center gap-2 rounded-2xl border border-line/90 bg-raised/75 px-3.5 text-left text-xs font-semibold text-text shadow-inset"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate">{selected.name}</span>
        <span className="hidden shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] text-success sm:inline">
          {selected.freeBays} free
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Switch place"
        description="Queues, alerts and pricing follow the place you choose."
      >
        <div className="space-y-2 pb-2">
          {allowed.map((place) => {
            const active = place.id === selected.id
            return (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  haptic('tap')
                  setSelectedPlace(place.id)
                  setOpen(false)
                }}
                className={cn(
                  'focus-ring flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors',
                  active ? 'border-accent/35 bg-accent/8' : 'border-line/80 bg-raised/40 hover:bg-raised',
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                    active ? 'border-accent/25 bg-accent/12 text-accent' : 'border-line bg-surface text-muted',
                  )}
                >
                  <PlaceIcon place={place} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">{place.name}</span>
                    {active ? <Check className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Selected" /> : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {place.freeBays} free · {formatCurrency(place.pricePerHour)}/hr · {place.kind}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </>
  )
}
