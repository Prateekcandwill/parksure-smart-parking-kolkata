import type { Place } from '@/types'

export interface LatLng {
  lat: number
  lng: number
}

type NavigationPlace = Pick<Place, 'name' | 'lat' | 'lng'>

/** OpenStreetMap directions, using the public OSRM car profile. */
export function osmDirectionsUrl(place: NavigationPlace, origin?: LatLng | null): string {
  const destination = `${place.lat},${place.lng}`
  if (origin) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat},${origin.lng};${destination}`
  }
  return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=17/${place.lat}/${place.lng}`
}

/** Static place page on OpenStreetMap. */
export function osmPlaceUrl(place: NavigationPlace): string {
  return `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`
}

export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }).Capacitor
  return Boolean(capacitor?.isNativePlatform?.())
}

/**
 * Opens a navigation URL. Native builds use the Capacitor browser so the
 * Android back button returns to ParkSure; the web build opens a new tab.
 */
export function openExternal(url: string): void {
  if (isNativeApp()) {
    void import('@capacitor/browser').then(({ Browser }) => Browser.open({ url }))
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not available on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
