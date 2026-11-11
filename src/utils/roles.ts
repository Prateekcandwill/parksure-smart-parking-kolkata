import type { Role, RoleMeta } from '@/types'

export const ROLE_ORDER: Role[] = ['driver', 'attendant', 'operator', 'admin']

export const ROLE_META: Record<Role, RoleMeta> = {
  driver: {
    role: 'driver',
    label: 'Driver',
    short: 'Driver',
    description: 'Find, book and pay for a bay.',
    unlocks: 'Live bay map · parking pass · wallet · wayfinding',
    home: '/driver/find',
    accent: 'gold',
  },
  attendant: {
    role: 'attendant',
    label: 'Attendant',
    short: 'Attendant',
    description: 'Run the gate with one clear decision at a time.',
    unlocks: 'ANPR checks · manual entry · cash collection',
    home: '/attendant/gate',
    accent: 'gold',
  },
  operator: {
    role: 'operator',
    label: 'Operator',
    short: 'Operator',
    description: 'Keep the lot moving and resolve exceptions.',
    unlocks: 'Live lot map · alerts · event log · cash reconciliation',
    home: '/operator/lot',
    accent: 'violet',
  },
  admin: {
    role: 'admin',
    label: 'Administrator',
    short: 'Admin',
    description: 'Set the rules that run every place.',
    unlocks: 'Thresholds · pricing · users · audit trail',
    home: '/admin/settings',
    accent: 'gold',
  },
}

export function roleHome(role: Role): string {
  return ROLE_META[role].home
}

export function roleLabel(role: Role): string {
  return ROLE_META[role].label
}
