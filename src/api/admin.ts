import type { AppData, ConfidenceThresholds, PaymentMethod, Place, PlaceKind, Role, Settings, User } from '@/types'
import { delay, getDB, mutateDB } from '@/api/db'
import { appendAudit } from '@/api/audit'
import { uid } from '@/utils/id'
import { prettyPlate } from '@/utils/plates'
import { staffSchema } from '@/utils/validation'

export class AdminError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AdminError'
    this.code = code
  }
}

export interface AdminConfigInput {
  thresholds: ConfidenceThresholds
  paymentMethods: Record<PaymentMethod, boolean>
  privacyRetentionText: string
  placePrices: Record<string, number>
  placeActive: Record<string, boolean>
}

export function validateAdminConfig(input: AdminConfigInput): string | null {
  const online: PaymentMethod[] = ['upi', 'qr', 'card', 'debit', 'fastag']
  if (!online.some((method) => input.paymentMethods[method])) {
    return 'Keep at least one online payment method enabled.'
  }
  const thresholds = input.thresholds
  if (
    Object.values(thresholds).some((value) => !Number.isFinite(value) || value < 0 || value > 100)
  ) {
    return 'Thresholds must be between 0 and 100.'
  }
  if (thresholds.occupied <= thresholds.free) {
    return 'Occupied confidence must be higher than free confidence.'
  }
  if (input.privacyRetentionText.trim().length < 20) {
    return 'Privacy retention wording must be at least 20 characters.'
  }
  if (Object.values(input.placePrices).some((value) => !Number.isFinite(value) || value <= 0)) {
    return 'Every place needs a positive hourly price.'
  }
  return null
}

export async function saveAdminConfig(input: {
  config: AdminConfigInput
  actor: User
  reason: string
}): Promise<Settings> {
  const validationError = validateAdminConfig(input.config)
  if (validationError) throw new AdminError('invalid_config', validationError)
  if (!input.reason.trim()) throw new AdminError('reason_required', 'A reason for change is required.')

  await delay(520)
  let settings!: Settings
  mutateDB((draft) => {
    settings = {
      ...draft.settings,
      thresholds: { ...input.config.thresholds },
      paymentMethods: { ...input.config.paymentMethods },
      privacyRetentionText: input.config.privacyRetentionText.trim(),
      updatedAt: new Date().toISOString(),
    }
    draft.settings = settings
    draft.places = draft.places.map((place) => ({
      ...place,
      pricePerHour: input.config.placePrices[place.id] ?? place.pricePerHour,
      active: input.config.placeActive[place.id] ?? place.active,
    }))
    appendAudit(draft, {
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: 'admin',
      action: 'Saved global configuration',
      target: 'Thresholds, pricing, places and payment methods',
      reason: input.reason.trim(),
    })
  })
  return settings
}

export async function addStaff(input: {
  name: string
  email: string
  phone: string
  roles: Role[]
  actor: User
  reason: string
}): Promise<User> {
  const parsed = staffSchema.safeParse(input)
  if (!parsed.success) throw new AdminError('invalid_input', parsed.error.issues[0]?.message ?? 'Check staff details.')
  await delay(420)
  const existing = getDB().users.find(
    (user) => user.email.toLowerCase() === input.email.trim().toLowerCase(),
  )
  if (existing) throw new AdminError('duplicate', 'A user with that email already exists.')
  const user: User = {
    id: uid('user'),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    roles: input.roles,
    staffId: `STF-${Math.floor(100 + Math.random() * 900)}`,
    placeIds: getDB().places.map((place) => place.id),
    vehicleIds: [],
    createdAt: new Date().toISOString(),
    avatarTone: 'violet',
  }
  mutateDB((draft) => {
    draft.users.push(user)
    appendAudit(draft, {
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: 'admin',
      action: 'Created staff account',
      target: `${user.name} · ${user.roles.join(', ')}`,
      reason: input.reason || 'New staff onboarding',
    })
  })
  return user
}

export async function updateUserRoles(input: {
  userId: string
  roles: Role[]
  actor: User
  reason: string
}): Promise<User> {
  if (input.roles.length === 0) throw new AdminError('invalid_roles', 'A user needs at least one role.')
  await delay(300)
  let updated!: User
  mutateDB((draft) => {
    const user = draft.users.find((candidate) => candidate.id === input.userId)
    if (!user) throw new AdminError('not_found', 'User not found.')
    if (user.id === input.actor.id && !input.roles.includes('admin')) {
      throw new AdminError('self_demote', 'You cannot remove your own administrator role.')
    }
    user.roles = input.roles
    updated = user
    appendAudit(draft, {
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: 'admin',
      action: 'Updated user roles',
      target: `${user.name} · ${input.roles.join(', ')}`,
      reason: input.reason || 'Role management',
    })
  })
  return updated
}

export async function addPlace(input: {
  name: string
  kind: PlaceKind
  address: string
  pricePerHour: number
  totalBays: number
  actor: User
  reason: string
}): Promise<Place> {
  await delay(460)
  if (input.name.trim().length < 3) throw new AdminError('invalid_name', 'Enter a place name.')
  if (input.pricePerHour <= 0) throw new AdminError('invalid_price', 'Enter a positive hourly price.')
  if (input.totalBays < 1 || input.totalBays > 500) {
    throw new AdminError('invalid_bays', 'Bays must be between 1 and 500.')
  }
  const placeId = uid('place')
  const cameraOnly = input.kind === 'ground'
  const place: Place = {
    id: placeId,
    name: input.name.trim(),
    kind: input.kind,
    address: input.address.trim() || 'Demo location',
    distanceKm: Number((0.6 + Math.random() * 4).toFixed(1)),
    pricePerHour: input.pricePerHour,
    totalBays: input.totalBays,
    levels: input.kind === 'multistory' ? 2 : 1,
    cameraOnly,
    estimatedFree: cameraOnly ? Math.floor(input.totalBays * 0.6) : undefined,
    estimatedTotal: cameraOnly ? input.totalBays : undefined,
    confidence: cameraOnly ? 62 : 90,
    active: true,
    features: [input.kind === 'ground' ? 'Open ground' : 'New demo place', 'Simulated sensors'],
    rules: ['Demo place created by an administrator.', 'All sensors and payments are simulated.'],
    lat: 12.93 + Math.random() * 0.1,
    lng: 77.6 + Math.random() * 0.1,
  }

  mutateDB((draft) => {
    draft.places.push(place)
    if (!cameraOnly) {
      const levels = place.levels
      const perLevel = Math.ceil(input.totalBays / levels)
      let counter = 0
      for (let level = 1; level <= levels; level += 1) {
        for (let index = 1; index <= perLevel && counter < input.totalBays; index += 1) {
          counter += 1
          const label = `${String.fromCharCode(64 + level)}${index}`
          const bayId = `bay_${placeId}_${label}`
          const sensorId = `sensor_${placeId}_${label}`
          draft.bays.push({
            id: bayId,
            placeId,
            label,
            level,
            row: String.fromCharCode(64 + level),
            side: index % 2 === 0 ? 'right' : 'left',
            status: counter % 3 === 0 ? 'occupied' : 'free',
            confidence: 88 + (counter % 10),
            sensorId,
            lastSeen: new Date().toISOString(),
          })
          draft.sensors.push({
            id: sensorId,
            bayId,
            placeId,
            type: 'magnetometer',
            status: 'online',
            battery: 90,
            lastSeen: new Date().toISOString(),
            occupiedReading: counter % 3 === 0,
            confidence: 88 + (counter % 10),
          })
        }
      }
    }
    appendAudit(draft, {
      actorId: input.actor.id,
      actorName: input.actor.name,
      actorRole: 'admin',
      action: 'Created parking place',
      target: `${place.name} · ${place.totalBays} bays`,
      reason: input.reason || 'New place onboarding',
    })
  })
  return place
}

export function getStaffUsers(): User[] {
  return getDB().users.filter((user) => user.roles.some((role) => role !== 'driver'))
}

export function getAllUsers(): User[] {
  return getDB().users
}

export function getAuditEvents() {
  return [...getDB().auditEvents].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
}

export function getAdminSnapshot(): AppData {
  return getDB()
}

export function describePlate(plate: string): string {
  return prettyPlate(plate)
}
