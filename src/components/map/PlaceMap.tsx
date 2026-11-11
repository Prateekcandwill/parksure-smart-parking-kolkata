import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { Crosshair, Loader2, Navigation } from 'lucide-react'
import type { PlaceSummary } from '@/api/places'
import { useUIStore } from '@/store/ui'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import { getCurrentPosition, type LatLng } from '@/utils/navigation'
import 'leaflet/dist/leaflet.css'

interface PlaceMapProps {
  places: PlaceSummary[]
  selectedId?: string | null
  onSelect?: (placeId: string) => void
  className?: string
  heightClass?: string
}

const KOLKATA_CENTER: [number, number] = [22.5726, 88.3639]

function markerColor(place: PlaceSummary): string {
  if (place.freeBays === 0) return '#FF8A8A'
  if (place.freeBays <= 2) return '#F5C45E'
  return '#5EE6A8'
}

function MapController({
  places,
  selectedId,
  onLocate,
}: {
  places: PlaceSummary[]
  selectedId?: string | null
  onLocate: (position: LatLng) => void
}) {
  const map = useMap()
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)
  const lastSelectedRef = useRef<string | null>(null)
  const placesKey = places.map((place) => place.id).join(',')

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(frame)
  }, [map])

  useEffect(() => {
    if (places.length === 0) return
    const points = places.map((place) => [place.lat, place.lng] as [number, number])
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    map.fitBounds(points, { padding: [38, 38], maxZoom: 14 })
    // Refit only when the set of places changes, not on every live price tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, placesKey])

  useEffect(() => {
    if (!selectedId) return
    if (lastSelectedRef.current === selectedId) return
    const selected = places.find((place) => place.id === selectedId)
    if (selected) {
      map.panTo([selected.lat, selected.lng], { animate: true })
      lastSelectedRef.current = selectedId
    }
  }, [map, places, selectedId])

  const locate = async () => {
    setLocating(true)
    setLocateError(null)
    try {
      const position = await getCurrentPosition()
      onLocate(position)
      map.flyTo([position.lat, position.lng], 15, { duration: 0.8 })
    } catch {
      setLocateError('Location unavailable')
    } finally {
      setLocating(false)
    }
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-2 p-3">
      <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-ink/80 px-3 py-1.5 text-[10px] font-semibold text-text shadow-lg backdrop-blur">
        <Navigation className="h-3 w-3 text-accent" aria-hidden="true" />
        OpenStreetMap · Kolkata
      </span>
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          aria-label="Show my location on the map"
          className="focus-ring flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-ink/85 text-text shadow-lg backdrop-blur transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        {locateError ? (
          <span className="rounded-full border border-warning/30 bg-ink/85 px-2.5 py-1 text-[9px] font-semibold text-warning backdrop-blur">
            {locateError}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function UserMarker({ position }: { position: LatLng | null }) {
  if (!position) return null
  return (
    <CircleMarker
      center={[position.lat, position.lng]}
      radius={7}
      pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#7DD3FC', fillOpacity: 1 }}
    >
      <Tooltip direction="top" offset={[0, -8]} opacity={1}>
        You are here
      </Tooltip>
    </CircleMarker>
  )
}

export function PlaceMap({
  places,
  selectedId,
  onSelect,
  className,
  heightClass = 'h-[320px] sm:h-[380px]',
}: PlaceMapProps) {
  const theme = useUIStore((state) => state.theme)
  const [userPosition, setUserPosition] = useState<LatLng | null>(null)
  const tileUrl =
    theme === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

  return (
    <div
      className={cn(
        'park-map relative isolate overflow-hidden rounded-3xl border border-line/80 bg-raised shadow-[0_28px_80px_-52px_rgb(0_0_0_/.9)]',
        heightClass,
        className,
      )}
    >
      <MapContainer
        center={KOLKATA_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
        aria-label="Map of ParkSure parking places in Kolkata"
      >
        <TileLayer
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />
        <MapController places={places} selectedId={selectedId} onLocate={setUserPosition} />
        <UserMarker position={userPosition} />
        {places.map((place) => {
          const selected = place.id === selectedId
          return (
            <CircleMarker
              key={place.id}
              center={[place.lat, place.lng]}
              radius={selected ? 13 : 9}
              pathOptions={{
                color: selected ? '#F6F4EE' : '#0B0B0F',
                weight: selected ? 3 : 2,
                fillColor: markerColor(place),
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => onSelect?.(place.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} className="park-map-tooltip">
                <div className="text-[11px] font-semibold leading-tight">{place.name}</div>
                <div className="mt-0.5 text-[10px] opacity-80">
                  {place.freeBays} free · {formatCurrency(place.pricePerHour)}/hr
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
