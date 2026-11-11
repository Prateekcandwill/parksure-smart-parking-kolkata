import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Camera,
  CircleParking,
  Clock3,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  SquareParking,
  Trees,
} from 'lucide-react'
import { useDB } from '@/api/useDB'
import { getPlace } from '@/api/places'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceMap } from '@/components/map/PlaceMap'
import { BayMap } from '@/components/parking/BayMap'
import { DemandBadge, PriceTag } from '@/components/parking/PriceTag'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfidenceBadge, StatusBadge } from '@/components/ui/StatusBadge'
import { openExternal, osmDirectionsUrl } from '@/utils/navigation'

export default function PlaceDetailPage() {
  useDB()
  const { placeId } = useParams()
  const place = placeId ? getPlace(placeId) : undefined

  if (!place) {
    return (
      <Card>
        <EmptyState
          icon={<CircleParking className="h-6 w-6" aria-hidden="true" />}
          title="Place not found"
          body="This lot may have been removed or deactivated. Search again for live parking nearby."
          action={
            <Link to="/driver/find" className={buttonClasses('primary', 'lg', 'w-full')}>
              Back to search
            </Link>
          }
        />
      </Card>
    )
  }

  const PlaceIcon = place.kind === 'multistory' ? Building2 : place.kind === 'surface' ? SquareParking : Trees
  const bookingHref = `/driver/book/${place.id}?type=instant`
  const prebookHref = `/driver/book/${place.id}?type=prebook`

  return (
    <div>
      <PageHeader
        back
        eyebrow="Kolkata · Place"
        title={place.name}
        description={place.address}
        action={<DemoBadge live />}
      />

      <div className="space-y-4">
        <Card strong className="p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
              <PlaceIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={place.freeBays > 2 ? 'success' : place.freeBays > 0 ? 'warning' : 'danger'}
                  label={`${place.freeBays} free`}
                />
                <ConfidenceBadge confidence={place.confidence} />
                {place.cameraOnly ? <StatusBadge tone="warning" label="Camera estimate" /> : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {place.distanceKm.toFixed(1)} km away
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Open 24 hours
                </span>
                <span className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  ANPR at gate
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-line/70 pt-4">
            <div>
              <div className="label-caps">Today&apos;s rate</div>
              <PriceTag place={place} size="lg" className="mt-1" />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <DemandBadge place={place} withReason />
                <span className="text-[10px] text-muted">{place.pricingReason}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-right">
              <div>
                <div className="label-caps">Bays</div>
                <div className="mt-1 font-mono text-base font-semibold text-text">
                  {place.freeBays}/{place.totalBays}
                </div>
                <div className="text-[10px] text-muted">free now</div>
              </div>
              <div>
                <div className="label-caps">Occupancy</div>
                <div className="mt-1 font-mono text-base font-semibold text-text">{place.occupancyPercent}%</div>
                <div className="text-[10px] text-muted">live estimate</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          <PlaceMap places={[place]} selectedId={place.id} heightClass="h-[260px] sm:h-[320px]" />
          <button
            type="button"
            onClick={() => openExternal(osmDirectionsUrl(place))}
            className={buttonClasses('primary', 'md', 'w-full')}
          >
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Open directions in OpenStreetMap
          </button>
          <p className="px-1 text-[10px] leading-relaxed text-muted">
            Directions open in OpenStreetMap in a new tab or the native browser. The embedded preview above uses the
            same OpenStreetMap data and can locate you for a driving route.
          </p>
        </div>

        <BayMap placeId={place.id} />

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">What this place offers</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {place.features.map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-line/80 bg-raised/50 px-2.5 py-1 text-[10px] font-medium text-muted"
              >
                {feature}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-text">Parking rules</h2>
          </div>
          <ul className="space-y-2">
            {place.rules.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {rule}
              </li>
            ))}
          </ul>
        </Card>

        <Card strong className="p-5">
          {place.cameraOnly ? (
            <>
              <div className="flex items-start gap-3">
                <Camera className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-lg font-semibold text-text">Unmarked open ground</h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    Camera estimates show likely availability, but no individual bay can be booked here. An
                    attendant will direct you on site and cash is accepted.
                  </p>
                </div>
              </div>
              <button type="button" disabled className={buttonClasses('secondary', 'lg', 'mt-4 w-full')}>
                Pre-booking unavailable
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-semibold text-text">Ready to park?</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Pay online and the best available bay is assigned instantly. Pre-book up to 24 hours ahead.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link to={bookingHref} className={buttonClasses('primary', 'lg', 'w-full')}>
                  Book now
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to={prebookHref} className={buttonClasses('secondary', 'lg', 'w-full')}>
                  Pre-book a bay
                </Link>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted">
                Simulated gateway · GST invoice generated on success
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
