export type Role = 'driver' | 'attendant' | 'operator' | 'admin'

export type PlaceKind = 'multistory' | 'surface' | 'ground'

export type BayStatus = 'free' | 'occupied' | 'reserved' | 'unknown'

export type SensorStatus = 'online' | 'offline' | 'low_battery'

export type BookingType = 'instant' | 'prebook'

export type ReservationStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'

export type PaymentMethod = 'upi' | 'qr' | 'card' | 'debit' | 'fastag' | 'cash'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'

export type PaymentContext = 'booking' | 'prebook' | 'extend' | 'exit' | 'cash' | 'topup'

export type AlertType =
  | 'sensor_offline'
  | 'low_battery'
  | 'low_confidence'
  | 'gate_jam'
  | 'payment'
  | 'ticket'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export type GateDirection = 'entry' | 'exit'

export type GateStatus = 'pending' | 'cleared' | 'refused' | 'manual'

export type ShiftStatus = 'open' | 'closed' | 'reconciled'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  roles: Role[]
  staffId?: string
  placeIds: string[]
  vehicleIds: string[]
  createdAt: string
  consentAt?: string
  avatarTone?: 'gold' | 'violet' | 'green' | 'blue'
}

export interface Place {
  id: string
  name: string
  kind: PlaceKind
  address: string
  distanceKm: number
  pricePerHour: number
  totalBays: number
  levels: number
  cameraOnly: boolean
  estimatedFree?: number
  estimatedTotal?: number
  confidence: number
  active: boolean
  features: string[]
  rules: string[]
  lat: number
  lng: number
}

export interface Bay {
  id: string
  placeId: string
  label: string
  level: number
  row: string
  side: 'left' | 'right' | 'center'
  status: BayStatus
  confidence: number
  sensorId: string
  lastSeen: string
}

export interface Sensor {
  id: string
  bayId: string
  placeId: string
  type: 'magnetometer'
  status: SensorStatus
  battery: number
  lastSeen: string
  occupiedReading: boolean
  confidence: number
}

export interface Vehicle {
  id: string
  userId: string
  plate: string
  make: string
  model: string
  isDefault: boolean
  fastagId?: string
  fastagBalance?: number
}

export interface Reservation {
  id: string
  userId: string
  placeId: string
  bayId: string
  vehicleId: string
  plate: string
  type: BookingType
  status: ReservationStatus
  startAt: string
  endAt: string
  createdAt: string
  amount: number
  paymentId: string
  level: number
  row: string
  side: 'left' | 'right' | 'center'
}

export interface ParkingSession {
  id: string
  reservationId?: string
  placeId: string
  bayId?: string
  plate: string
  entryAt: string
  exitAt?: string
  status: 'active' | 'closed'
  amount: number
  paymentId?: string
  gateEventId?: string
}

export interface Payment {
  id: string
  reference: string
  idempotencyKey: string
  userId: string
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  kind: 'payment' | 'refund'
  context: PaymentContext
  createdAt: string
  paidAt?: string
  receiptId?: string
  attendantId?: string
  shiftId?: string
  meta?: {
    last4?: string
    brand?: string
    upiId?: string
    upiApp?: string
    tagId?: string
    simulatedFailure?: boolean
    saveMethod?: boolean
    expiry?: string
    originalPaymentId?: string
    refundPercent?: number
  }
}

export interface ReceiptLine {
  label: string
  amount: number
}

export interface Receipt {
  id: string
  number: string
  paymentId: string
  issuedAt: string
  userId: string
  userName: string
  plate?: string
  placeName?: string
  lines: ReceiptLine[]
  subtotal: number
  cgst: number
  sgst: number
  total: number
  gstin: string
  notes: string
}

export interface PaymentMethodRecord {
  id: string
  userId: string
  type: Exclude<PaymentMethod, 'cash' | 'qr'>
  label: string
  detail: string
  last4?: string
  brand?: string
  upiId?: string
  tagId?: string
  linkedPlate?: string
  balance?: number
  isDefault?: boolean
}

export interface Alert {
  id: string
  placeId: string
  type: AlertType
  severity: AlertSeverity
  status: AlertStatus
  message: string
  bayId?: string
  createdAt: string
  acknowledgedAt?: string
  assignedTo?: string
  ticketId?: string
}

export interface AuditEvent {
  id: string
  at: string
  actorId: string
  actorName: string
  actorRole: Role | 'system'
  action: string
  target: string
  reason?: string
  prevHash: string
  hash: string
}

export interface GateEvent {
  id: string
  placeId: string
  direction: GateDirection
  plateRead: string
  plateExpected?: string
  confidence: number
  at: string
  status: GateStatus
  paymentDue?: number
  prebooked?: boolean
  reservationId?: string
  attendantId?: string
  note?: string
}

export interface CashShift {
  id: string
  placeId: string
  attendantId: string
  startedAt: string
  endedAt?: string
  status: ShiftStatus
  cashCollected: number
  transactions: number
  openingFloat: number
  reconciledAt?: string
  countedAmount?: number
  variance?: number
  reason?: string
  reconciledBy?: string
}

export interface ConfidenceThresholds {
  occupied: number
  free: number
  reservationLock: number
  pricing: number
  lowConfidence: number
}

export interface Settings {
  thresholds: ConfidenceThresholds
  paymentMethods: Record<PaymentMethod, boolean>
  privacyRetentionText: string
  updatedAt: string
}

export interface AppData {
  version: number
  seededAt: string
  users: User[]
  places: Place[]
  bays: Bay[]
  sensors: Sensor[]
  vehicles: Vehicle[]
  reservations: Reservation[]
  sessions: ParkingSession[]
  payments: Payment[]
  receipts: Receipt[]
  paymentMethods: PaymentMethodRecord[]
  alerts: Alert[]
  auditEvents: AuditEvent[]
  gateEvents: GateEvent[]
  shifts: CashShift[]
  settings: Settings
}

export interface PriceBreakdown {
  base: number
  cgst: number
  sgst: number
  total: number
  minutes: number
  hourlyRate: number
}

export interface PaymentRequest {
  userId: string
  amount: number
  method: PaymentMethod
  context: PaymentContext
  idempotencyKey: string
  allowCash?: boolean
  prebooked?: boolean
  attendantId?: string
  shiftId?: string
  receiptLabel?: string
  placeName?: string
  plate?: string
  actorId?: string
  actorName?: string
  actorRole?: Role | 'system'
  meta?: Payment['meta']
}

export interface PaymentResult {
  payment: Payment
  receipt: Receipt
}

export interface BookingRequest {
  userId: string
  placeId: string
  vehicleId: string
  type: BookingType
  startAt: string
  endAt: string
  amount: number
  paymentId: string
}

export interface RoleMeta {
  role: Role
  label: string
  short: string
  description: string
  unlocks: string
  home: string
  accent: 'gold' | 'violet'
}
