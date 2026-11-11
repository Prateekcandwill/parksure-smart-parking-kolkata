import { useEffect } from 'react'
import { useDB } from '@/api/useDB'
import { listPlaces, type PlaceSummary } from '@/api/places'
import { useUIStore } from '@/store/ui'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function useActivePlace(): PlaceSummary | undefined {
  useDB()
  const user = useCurrentUser()
  const selectedPlaceId = useUIStore((state) => state.selectedPlaceId)
  const setSelectedPlace = useUIStore((state) => state.setSelectedPlace)
  const places = listPlaces()
  const allowed = places.filter(
    (place) =>
      !user ||
      user.roles.includes('admin') ||
      user.placeIds.length === 0 ||
      user.placeIds.includes(place.id),
  )
  const active = allowed.find((place) => place.id === selectedPlaceId) ?? allowed[0]

  useEffect(() => {
    if (active && active.id !== selectedPlaceId) setSelectedPlace(active.id)
  }, [active, selectedPlaceId, setSelectedPlace])

  return active
}
