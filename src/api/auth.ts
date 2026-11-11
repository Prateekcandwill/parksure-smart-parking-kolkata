import type { Role, User, Vehicle } from '@/types'
import { delay, mutateDB, getDB } from '@/api/db'
import { appendAudit } from '@/api/audit'
import { DEMO_CONFIG } from '@/config/env'
import { uid } from '@/utils/id'
import {
  normalizeIdentifier,
  normalizePhone,
  profileSchema,
  registrationSchema,
  type ProfileInput,
} from '@/utils/validation'
import { prettyPlate } from '@/utils/plates'

export const DEMO_OTP = DEMO_CONFIG.otp
export const DEMO_PASSWORD = DEMO_CONFIG.password

export class AuthError extends Error {
  code: 'not_found' | 'invalid_otp' | 'invalid_password' | 'duplicate' | 'invalid_input'

  constructor(code: AuthError['code'], message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

function findUser(identifier: string): User | undefined {
  const normalized = normalizeIdentifier(identifier)
  const digits = normalizePhone(identifier)
  return getDB().users.find((user) => {
    return (
      user.email.toLowerCase() === normalized ||
      user.email.toLowerCase() === identifier.trim().toLowerCase() ||
      normalizePhone(user.phone) === digits
    )
  })
}

export async function requestOtp(identifier: string): Promise<{ destination: string }> {
  await delay(520)
  const user = findUser(identifier)
  if (!user) {
    throw new AuthError('not_found', 'No ParkSure account matches that phone number or email.')
  }
  const isMail = identifier.includes('@')
  return {
    destination: isMail ? user.email : `••••••${user.phone.slice(-4)}`,
  }
}

export async function signIn(input: {
  identifier: string
  method: 'otp' | 'password'
  secret: string
}): Promise<User> {
  await delay(480)
  const user = findUser(input.identifier)
  if (!user) {
    throw new AuthError('not_found', 'No ParkSure account matches those details. Check them or create a driver account.')
  }

  if (input.method === 'otp' && input.secret !== DEMO_OTP) {
    throw new AuthError('invalid_otp', `That OTP is not correct. Use ${DEMO_OTP} in demo mode.`)
  }
  if (input.method === 'password' && input.secret !== DEMO_PASSWORD) {
    throw new AuthError('invalid_password', `That password is not correct. Demo password: ${DEMO_PASSWORD}.`)
  }

  return user
}

export async function continueWithGoogle(): Promise<User> {
  await delay(720)
  const user = getDB().users.find((candidate) => candidate.id === 'u_driver')
  if (!user) throw new AuthError('not_found', 'The simulated Google account is unavailable.')
  return user
}

export async function registerDriver(input: {
  name: string
  phone: string
  plate: string
  consent: boolean
}): Promise<{ user: User; vehicle: Vehicle }> {
  const parsed = registrationSchema.safeParse(input)
  if (!parsed.success) {
    throw new AuthError('invalid_input', parsed.error.issues[0]?.message ?? 'Check your details.')
  }

  await delay(650)
  const phone = normalizePhone(parsed.data.phone)
  const existing = getDB().users.find((user) => normalizePhone(user.phone) === phone)
  if (existing) {
    throw new AuthError('duplicate', 'An account already uses that phone number. Try signing in instead.')
  }

  const userId = uid('user')
  const vehicleId = uid('vehicle')
  const plate = prettyPlate(parsed.data.plate)
  const user: User = {
    id: userId,
    name: parsed.data.name.trim(),
    email: `${phone}@driver.parksure.demo`,
    phone,
    roles: ['driver'],
    placeIds: [],
    vehicleIds: [vehicleId],
    createdAt: new Date().toISOString(),
    consentAt: new Date().toISOString(),
    avatarTone: 'gold',
  }
  const vehicle: Vehicle = {
    id: vehicleId,
    userId,
    plate,
    make: 'Personal vehicle',
    model: 'Registered at sign-up',
    isDefault: true,
  }

  mutateDB((draft) => {
    draft.users.push(user)
    draft.vehicles.push(vehicle)
    appendAudit(draft, {
      actorId: userId,
      actorName: user.name,
      actorRole: 'driver',
      action: 'Created driver account',
      target: plate,
      reason: 'Consent captured at registration',
    })
  })

  return { user, vehicle }
}

export async function updateProfile(
  userId: string,
  input: ProfileInput,
  actorRole: Role = 'driver',
): Promise<User> {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    throw new AuthError('invalid_input', parsed.error.issues[0]?.message ?? 'Check your profile details.')
  }

  await delay(380)
  const current = getDB().users.find((user) => user.id === userId)
  if (!current) {
    throw new AuthError('not_found', 'That account is no longer available in this demo.')
  }

  const email = parsed.data.email.trim().toLowerCase()
  const phone = normalizePhone(parsed.data.phone)
  const duplicate = getDB().users.find(
    (user) =>
      user.id !== userId &&
      (user.email.toLowerCase() === email || normalizePhone(user.phone) === phone),
  )
  if (duplicate) {
    throw new AuthError('duplicate', 'Another demo account already uses that email or phone number.')
  }

  let updated: User = current
  mutateDB((draft) => {
    draft.users = draft.users.map((user) => {
      if (user.id !== userId) return user
      updated = {
        ...user,
        name: parsed.data.name.trim(),
        email,
        phone,
        avatarTone: parsed.data.avatarTone,
      }
      return updated
    })
    const changed = [
      current.name !== updated.name ? 'name' : null,
      current.email.toLowerCase() !== updated.email.toLowerCase() ? 'email' : null,
      normalizePhone(current.phone) !== normalizePhone(updated.phone) ? 'phone' : null,
      current.avatarTone !== updated.avatarTone ? 'avatar' : null,
    ].filter(Boolean)
    appendAudit(draft, {
      actorId: userId,
      actorName: updated.name,
      actorRole,
      action: 'Updated account profile',
      target: updated.email,
      reason: changed.length > 0 ? `Changed: ${changed.join(', ')}` : 'No field changed',
    })
  })

  return updated
}

export function getUser(userId: string): User | undefined {
  return getDB().users.find((user) => user.id === userId)
}

export function getVehicles(userId: string): Vehicle[] {
  return getDB().vehicles.filter((vehicle) => vehicle.userId === userId)
}
