import type {
  Alert,
  AppData,
  AuditEvent,
  Bay,
  CashShift,
  GateEvent,
  Payment,
  PaymentMethodRecord,
  Place,
  Receipt,
  Reservation,
  Sensor,
  Settings,
  User,
  Vehicle,
} from '@/types'
import { computeAuditHash } from '@/utils/hash'
import { roundCurrency } from '@/utils/format'

const now = Date.now()
const atMinutes = (minutes: number) => new Date(now + minutes * 60_000).toISOString()
const atDays = (days: number) => new Date(now + days * 86_400_000).toISOString()

function tomorrowAt(hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const settings: Settings = {
  thresholds: {
    occupied: 80,
    free: 75,
    reservationLock: 70,
    pricing: 60,
    lowConfidence: 65,
  },
  paymentMethods: {
    upi: true,
    qr: true,
    card: true,
    debit: true,
    fastag: true,
    cash: true,
  },
  privacyRetentionText:
    'ParkSure keeps vehicle plates, session records and payment references only for the period required by local parking and tax rules. Demo data stays in this browser. In production, records are erased or anonymised after the retention period, with a notice in your account.',
  updatedAt: atDays(-2),
}

const places: Place[] = [
  {
    id: 'central',
    name: 'Park Street Centre',
    kind: 'multistory',
    address: 'Park Street, near Allen Park, Kolkata 700016',
    distanceKm: 0.4,
    pricePerHour: 60,
    totalBays: 12,
    levels: 2,
    cameraOnly: false,
    confidence: 94,
    active: true,
    features: ['Covered parking', 'ANPR entry', '24/7 security', 'EV charging nearby'],
    rules: [
      'Enter within 15 minutes of booking.',
      'The barrier opens automatically after plate confirmation.',
      'Keep the parking pass visible until you exit.',
      'Valet assistance is available after 7 pm on Park Street.',
    ],
    lat: 22.5535,
    lng: 88.352,
  },
  {
    id: 'north',
    name: 'Salt Lake Sector V',
    kind: 'multistory',
    address: 'Wipro Circle, Sector V, Bidhannagar, Kolkata 700091',
    distanceKm: 1.2,
    pricePerHour: 40,
    totalBays: 16,
    levels: 3,
    cameraOnly: false,
    confidence: 91,
    active: true,
    features: ['Multilevel', 'FASTag exit', 'Lift access', 'Card payments'],
    rules: [
      'Level 2 Row B is the closest entry to the Wipro Circle footbridge.',
      'Pre-booked bays are held for 20 minutes after the start time.',
      'Oversized vehicles must use the surface overflow area.',
      'Exit payment can use FASTag or any online method.',
    ],
    lat: 22.5867,
    lng: 88.4173,
  },
  {
    id: 'metro',
    name: 'Howrah Station Forecourt',
    kind: 'surface',
    address: 'Howrah Station Forecourt, Howrah, Kolkata 711101',
    distanceKm: 2.1,
    pricePerHour: 35,
    totalBays: 10,
    levels: 1,
    cameraOnly: false,
    confidence: 89,
    active: true,
    features: ['Marked surface bays', 'Step-free access', 'CCTV', 'Short walk to Howrah Metro'],
    rules: [
      'Bays are marked M1 to M10.',
      'No overnight parking without an operator ticket.',
      'Use the pedestrian gate beside the taxi rank.',
    ],
    lat: 22.5839,
    lng: 88.3425,
  },
  {
    id: 'lakeside',
    name: 'Maidan – Victoria Memorial',
    kind: 'ground',
    address: 'Victoria Memorial Grounds, Maidan, Kolkata 700071',
    distanceKm: 3.4,
    pricePerHour: 30,
    totalBays: 30,
    levels: 1,
    cameraOnly: true,
    estimatedFree: 18,
    estimatedTotal: 30,
    confidence: 62,
    active: true,
    features: ['Open ground', 'Camera estimate', 'Event parking', 'Cash accepted on site'],
    rules: [
      'This is an unmarked open ground; no individual bay can be booked.',
      'Camera estimates guide you to a likely open zone.',
      'An attendant will direct you to a safe parking spot.',
      'Online pre-booking is not available at this place.',
    ],
    lat: 22.5448,
    lng: 88.3426,
  },
]

interface BaySeed {
  placeId: string
  label: string
  level: number
  row: string
  side: Bay['side']
  status: Bay['status']
  confidence: number
  sensor?: Sensor['status']
  battery?: number
}

const baySeeds: BaySeed[] = [
  { placeId: 'central', label: 'A1', level: 1, row: 'A', side: 'left', status: 'occupied', confidence: 96 },
  { placeId: 'central', label: 'A2', level: 1, row: 'A', side: 'right', status: 'free', confidence: 94 },
  { placeId: 'central', label: 'A3', level: 1, row: 'A', side: 'left', status: 'occupied', confidence: 91 },
  {
    placeId: 'central',
    label: 'A4',
    level: 1,
    row: 'A',
    side: 'right',
    status: 'unknown',
    confidence: 41,
    sensor: 'low_battery',
    battery: 9,
  },
  { placeId: 'central', label: 'B1', level: 2, row: 'B', side: 'left', status: 'free', confidence: 96 },
  { placeId: 'central', label: 'B2', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 93 },
  { placeId: 'central', label: 'B3', level: 2, row: 'B', side: 'left', status: 'free', confidence: 78 },
  { placeId: 'central', label: 'B4', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 97 },
  { placeId: 'central', label: 'B5', level: 2, row: 'B', side: 'left', status: 'free', confidence: 95 },
  { placeId: 'central', label: 'B6', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 92 },
  { placeId: 'central', label: 'B7', level: 2, row: 'B', side: 'left', status: 'free', confidence: 98 },
  { placeId: 'central', label: 'B8', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 90 },
  { placeId: 'north', label: 'B1', level: 2, row: 'B', side: 'left', status: 'free', confidence: 95 },
  { placeId: 'north', label: 'B2', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 93 },
  { placeId: 'north', label: 'B3', level: 2, row: 'B', side: 'left', status: 'free', confidence: 92 },
  { placeId: 'north', label: 'B4', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 96 },
  { placeId: 'north', label: 'B5', level: 2, row: 'B', side: 'left', status: 'free', confidence: 89 },
  { placeId: 'north', label: 'B6', level: 2, row: 'B', side: 'right', status: 'reserved', confidence: 91 },
  { placeId: 'north', label: 'B7', level: 2, row: 'B', side: 'left', status: 'occupied', confidence: 94 },
  { placeId: 'north', label: 'B8', level: 2, row: 'B', side: 'right', status: 'free', confidence: 96 },
  { placeId: 'north', label: 'B9', level: 2, row: 'B', side: 'left', status: 'occupied', confidence: 90 },
  { placeId: 'north', label: 'B10', level: 2, row: 'B', side: 'right', status: 'free', confidence: 93 },
  { placeId: 'north', label: 'B11', level: 2, row: 'B', side: 'left', status: 'occupied', confidence: 95 },
  { placeId: 'north', label: 'B12', level: 2, row: 'B', side: 'right', status: 'free', confidence: 91 },
  { placeId: 'north', label: 'B13', level: 2, row: 'B', side: 'left', status: 'occupied', confidence: 92 },
  { placeId: 'north', label: 'B14', level: 2, row: 'B', side: 'right', status: 'free', confidence: 88 },
  {
    placeId: 'north',
    label: 'B15',
    level: 2,
    row: 'B',
    side: 'left',
    status: 'unknown',
    confidence: 0,
    sensor: 'offline',
    battery: 64,
  },
  { placeId: 'north', label: 'B16', level: 2, row: 'B', side: 'right', status: 'occupied', confidence: 94 },
  { placeId: 'metro', label: 'M1', level: 1, row: 'M', side: 'left', status: 'occupied', confidence: 92 },
  { placeId: 'metro', label: 'M2', level: 1, row: 'M', side: 'right', status: 'free', confidence: 90 },
  { placeId: 'metro', label: 'M3', level: 1, row: 'M', side: 'left', status: 'occupied', confidence: 95 },
  { placeId: 'metro', label: 'M4', level: 1, row: 'M', side: 'right', status: 'free', confidence: 93 },
  { placeId: 'metro', label: 'M5', level: 1, row: 'M', side: 'left', status: 'occupied', confidence: 91 },
  { placeId: 'metro', label: 'M6', level: 1, row: 'M', side: 'right', status: 'free', confidence: 94 },
  { placeId: 'metro', label: 'M7', level: 1, row: 'M', side: 'left', status: 'occupied', confidence: 89 },
  { placeId: 'metro', label: 'M8', level: 1, row: 'M', side: 'right', status: 'free', confidence: 92 },
  {
    placeId: 'metro',
    label: 'M9',
    level: 1,
    row: 'M',
    side: 'left',
    status: 'unknown',
    confidence: 52,
    sensor: 'low_battery',
    battery: 14,
  },
  { placeId: 'metro', label: 'M10', level: 1, row: 'M', side: 'right', status: 'occupied', confidence: 90 },
]

const bays: Bay[] = baySeeds.map((seed) => ({
  id: `bay_${seed.placeId}_${seed.label}`,
  placeId: seed.placeId,
  label: seed.label,
  level: seed.level,
  row: seed.row,
  side: seed.side,
  status: seed.status,
  confidence: seed.confidence,
  sensorId: `sensor_${seed.placeId}_${seed.label}`,
  lastSeen: atMinutes(seed.sensor === 'offline' ? -48 : -Math.floor(Math.random() * 4) - 1),
}))

const sensors: Sensor[] = baySeeds.map((seed, index) => {
  const status = seed.sensor ?? 'online'
  return {
    id: `sensor_${seed.placeId}_${seed.label}`,
    bayId: `bay_${seed.placeId}_${seed.label}`,
    placeId: seed.placeId,
    type: 'magnetometer',
    status,
    battery: seed.battery ?? 68 + ((index * 7) % 30),
    lastSeen: atMinutes(status === 'offline' ? -48 : -Math.floor(Math.random() * 4) - 1),
    occupiedReading: seed.status === 'occupied' || seed.status === 'reserved',
    confidence: seed.confidence,
  }
})

const users: User[] = [
  {
    id: 'u_driver',
    name: 'Aritra Sen',
    email: 'driver@demo',
    phone: '9830000001',
    roles: ['driver'],
    placeIds: [],
    vehicleIds: ['v_driver_1', 'v_driver_2'],
    createdAt: atDays(-180),
    consentAt: atDays(-180),
    avatarTone: 'gold',
  },
  {
    id: 'u_attendant',
    name: 'Sujit Das',
    email: 'attendant@demo',
    phone: '9830000002',
    roles: ['attendant'],
    staffId: 'ATT-204',
    placeIds: ['central'],
    vehicleIds: [],
    createdAt: atDays(-420),
    avatarTone: 'violet',
  },
  {
    id: 'u_operator',
    name: 'Rituparna Ghosh',
    email: 'operator@demo',
    phone: '9830000003',
    roles: ['operator'],
    staffId: 'OPS-118',
    placeIds: ['central', 'north', 'metro', 'lakeside'],
    vehicleIds: [],
    createdAt: atDays(-610),
    avatarTone: 'green',
  },
  {
    id: 'u_admin',
    name: 'Debargha Mitra',
    email: 'admin@demo',
    phone: '9830000004',
    roles: ['driver', 'attendant', 'operator', 'admin'],
    staffId: 'ADM-001',
    placeIds: ['central', 'north', 'metro', 'lakeside'],
    vehicleIds: ['v_admin_1'],
    createdAt: atDays(-900),
    avatarTone: 'blue',
  },
]

const vehicles: Vehicle[] = [
  {
    id: 'v_driver_1',
    userId: 'u_driver',
    plate: 'WB 06 AR 1234',
    make: 'Hyundai',
    model: 'Creta',
    isDefault: true,
    fastagId: 'FT-WB06AR1234',
    fastagBalance: 420,
  },
  {
    id: 'v_driver_2',
    userId: 'u_driver',
    plate: 'WB 02 EV 5521',
    make: 'Tata',
    model: 'Nexon EV',
    isDefault: false,
  },
  {
    id: 'v_admin_1',
    userId: 'u_admin',
    plate: 'WB 24 CM 9090',
    make: 'BMW',
    model: '3 Series',
    isDefault: true,
    fastagId: 'FT-WB24CM9090',
    fastagBalance: 860,
  },
]

const paymentMethods: PaymentMethodRecord[] = [
  {
    id: 'pm_fastag',
    userId: 'u_driver',
    type: 'fastag',
    label: 'FASTag · HDFC Bank',
    detail: 'Linked to WB 06 AR 1234',
    tagId: 'FT-WB06AR1234',
    linkedPlate: 'WB 06 AR 1234',
    balance: 420,
    isDefault: true,
  },
  {
    id: 'pm_upi',
    userId: 'u_driver',
    type: 'upi',
    label: 'UPI',
    detail: 'aritra@okhdfc',
    upiId: 'aritra@okhdfc',
  },
  {
    id: 'pm_card',
    userId: 'u_driver',
    type: 'card',
    label: 'Visa ···· 4242',
    detail: 'Expires 08/29',
    brand: 'Visa',
    last4: '4242',
  },
  {
    id: 'pm_admin_upi',
    userId: 'u_admin',
    type: 'upi',
    label: 'UPI',
    detail: 'debargha@okaxis',
    upiId: 'debargha@okaxis',
    isDefault: true,
  },
]

function receiptFor(
  payment: Payment,
  user: User,
  placeName: string | undefined,
  plate: string | undefined,
  label: string,
  suffix: string,
): Receipt {
  const base = roundCurrency(payment.amount / 1.18)
  const cgst = roundCurrency(base * 0.09)
  const sgst = roundCurrency(payment.amount - base - cgst)
  return {
    id: `receipt_${suffix}`,
    number: `PS-R-${new Date(payment.createdAt).getFullYear()}-${suffix.toUpperCase()}`,
    paymentId: payment.id,
    issuedAt: payment.paidAt ?? payment.createdAt,
    userId: user.id,
    userName: user.name,
    plate,
    placeName,
    lines: [{ label, amount: base }],
    subtotal: base,
    cgst,
    sgst,
    total: payment.amount,
    gstin: '19AABCP1234F1Z5',
    notes: 'Demo GST invoice. Parking services are simulated in this build.',
  }
}

const adminUser = users.find((user) => user.id === 'u_admin')!
const driverUser = users.find((user) => user.id === 'u_driver')!

const prebookStart = tomorrowAt(10)
const prebookEnd = new Date(new Date(prebookStart).getTime() + 2 * 60 * 60_000).toISOString()
const adminPayment: Payment = {
  id: 'pay_admin_prebook',
  reference: 'PS-PRE-8F3K2M',
  idempotencyKey: 'seed-admin-prebook',
  userId: 'u_admin',
  amount: 118,
  method: 'upi',
  status: 'success',
  kind: 'payment',
  context: 'prebook',
  createdAt: atDays(-1),
  paidAt: atDays(-1),
  receiptId: 'receipt_admin_prebook',
  meta: { upiId: 'debargha@okaxis' },
}
const adminReceipt = receiptFor(
  adminPayment,
  adminUser,
  'Salt Lake Sector V',
  'WB 24 CM 9090',
  'Pre-booked parking · 2 hours',
  'admin_prebook',
)
adminPayment.receiptId = adminReceipt.id

const adminReservation: Reservation = {
  id: 'res_admin_prebook',
  userId: 'u_admin',
  placeId: 'north',
  bayId: 'bay_north_B6',
  vehicleId: 'v_admin_1',
  plate: 'WB 24 CM 9090',
  type: 'prebook',
  status: 'upcoming',
  startAt: prebookStart,
  endAt: prebookEnd,
  createdAt: atDays(-1),
  amount: 118,
  paymentId: adminPayment.id,
  level: 2,
  row: 'B',
  side: 'right',
}

const completedStart = atDays(-3)
const completedEnd = new Date(new Date(completedStart).getTime() + 2 * 60 * 60_000).toISOString()
const completedPayment: Payment = {
  id: 'pay_driver_completed',
  reference: 'PS-PAY-2Q7N4L',
  idempotencyKey: 'seed-driver-completed',
  userId: 'u_driver',
  amount: 141.6,
  method: 'card',
  status: 'success',
  kind: 'payment',
  context: 'booking',
  createdAt: completedStart,
  paidAt: completedStart,
  receiptId: 'receipt_driver_completed',
  meta: { brand: 'Visa', last4: '4242' },
}
const completedReceipt = receiptFor(
  completedPayment,
  driverUser,
  'Park Street Centre',
  'WB 06 AR 1234',
  'Parking session · 2 hours',
  'driver_completed',
)
completedPayment.receiptId = completedReceipt.id

const completedReservation: Reservation = {
  id: 'res_driver_completed',
  userId: 'u_driver',
  placeId: 'central',
  bayId: 'bay_central_A2',
  vehicleId: 'v_driver_1',
  plate: 'WB 06 AR 1234',
  type: 'instant',
  status: 'completed',
  startAt: completedStart,
  endAt: completedEnd,
  createdAt: completedStart,
  amount: 141.6,
  paymentId: completedPayment.id,
  level: 1,
  row: 'A',
  side: 'right',
}

const failedPayment: Payment = {
  id: 'pay_driver_failed',
  reference: 'PS-PAY-6T1V8X',
  idempotencyKey: 'seed-driver-failed',
  userId: 'u_driver',
  amount: 40,
  method: 'upi',
  status: 'failed',
  kind: 'payment',
  context: 'exit',
  createdAt: atDays(-4),
  meta: { upiId: 'aritra@okhdfc', simulatedFailure: true },
}

const refundedOriginal: Payment = {
  id: 'pay_driver_refunded',
  reference: 'PS-PRE-1M9C3D',
  idempotencyKey: 'seed-driver-refunded',
  userId: 'u_driver',
  amount: 94.4,
  method: 'upi',
  status: 'refunded',
  kind: 'payment',
  context: 'prebook',
  createdAt: atDays(-8),
  paidAt: atDays(-8),
  meta: { upiId: 'aritra@okhdfc' },
}
const refundPayment: Payment = {
  id: 'pay_driver_refund',
  reference: 'PS-RFD-5J2H7K',
  idempotencyKey: 'seed-driver-refund',
  userId: 'u_driver',
  amount: 84.96,
  method: 'upi',
  status: 'success',
  kind: 'refund',
  context: 'prebook',
  createdAt: atDays(-7),
  paidAt: atDays(-7),
  meta: { originalPaymentId: refundedOriginal.id, refundPercent: 90 },
}

const shift: CashShift = {
  id: 'shift_att_1',
  placeId: 'central',
  attendantId: 'u_attendant',
  startedAt: atMinutes(-290),
  status: 'open',
  cashCollected: 260,
  transactions: 3,
  openingFloat: 500,
}

const cashPayments: Payment[] = [
  {
    id: 'pay_cash_1',
    reference: 'PS-CSH-4A7B2C',
    idempotencyKey: 'seed-cash-1',
    userId: 'u_driver',
    amount: 60,
    method: 'cash',
    status: 'success',
    kind: 'payment',
    context: 'cash',
    createdAt: atMinutes(-180),
    paidAt: atMinutes(-180),
    attendantId: 'u_attendant',
    shiftId: shift.id,
    receiptId: 'receipt_cash_1',
  },
  {
    id: 'pay_cash_2',
    reference: 'PS-CSH-9D4E6F',
    idempotencyKey: 'seed-cash-2',
    userId: 'u_driver',
    amount: 80,
    method: 'cash',
    status: 'success',
    kind: 'payment',
    context: 'cash',
    createdAt: atMinutes(-95),
    paidAt: atMinutes(-95),
    attendantId: 'u_attendant',
    shiftId: shift.id,
    receiptId: 'receipt_cash_2',
  },
  {
    id: 'pay_cash_3',
    reference: 'PS-CSH-3G8H1J',
    idempotencyKey: 'seed-cash-3',
    userId: 'u_driver',
    amount: 120,
    method: 'cash',
    status: 'success',
    kind: 'payment',
    context: 'cash',
    createdAt: atMinutes(-32),
    paidAt: atMinutes(-32),
    attendantId: 'u_attendant',
    shiftId: shift.id,
    receiptId: 'receipt_cash_3',
  },
]

const cashReceipts = cashPayments.map((payment, index) =>
  receiptFor(
    payment,
    driverUser,
    'Park Street Centre',
    ['WB 06 MN 4410', 'WB 02 DK 7788', 'WB 24 QR 9081'][index],
    'Parking exit · cash collection',
    `cash_${index + 1}`,
  ),
)

const alerts: Alert[] = [
  {
    id: 'alert_1',
    placeId: 'north',
    type: 'sensor_offline',
    severity: 'critical',
    status: 'open',
    message: 'Magnetometer on bay B15 is offline. Fusion confidence is 0%.',
    bayId: 'bay_north_B15',
    createdAt: atMinutes(-48),
  },
  {
    id: 'alert_2',
    placeId: 'central',
    type: 'low_battery',
    severity: 'warning',
    status: 'open',
    message: 'Sensor battery on bay A4 is at 9%. Readings may become unreliable.',
    bayId: 'bay_central_A4',
    createdAt: atMinutes(-125),
  },
  {
    id: 'alert_3',
    placeId: 'central',
    type: 'low_confidence',
    severity: 'warning',
    status: 'acknowledged',
    message: 'Bay B3 fusion confidence has stayed below 80% for 12 minutes.',
    bayId: 'bay_central_B3',
    createdAt: atMinutes(-80),
    acknowledgedAt: atMinutes(-66),
    assignedTo: 'u_operator',
  },
  {
    id: 'alert_4',
    placeId: 'north',
    type: 'gate_jam',
    severity: 'critical',
    status: 'open',
    message: 'Exit barrier at Salt Lake Sector V has been open for 4 minutes.',
    createdAt: atMinutes(-6),
  },
  {
    id: 'alert_5',
    placeId: 'metro',
    type: 'payment',
    severity: 'info',
    status: 'open',
    message: 'UPI collect latency is elevated. Fallback methods are available.',
    createdAt: atMinutes(-18),
  },
  {
    id: 'alert_6',
    placeId: 'central',
    type: 'low_confidence',
    severity: 'warning',
    status: 'open',
    message: 'Bay A4 has an unknown state after a low-battery reading.',
    bayId: 'bay_central_A4',
    createdAt: atMinutes(-40),
  },
]

const gateEvents: GateEvent[] = [
  {
    id: 'gate_1',
    placeId: 'central',
    direction: 'entry',
    plateRead: 'WB 06 MN 4410',
    plateExpected: 'WB 06 MN 4410',
    confidence: 97,
    at: atMinutes(-2),
    status: 'pending',
  },
  {
    id: 'gate_2',
    placeId: 'central',
    direction: 'exit',
    plateRead: 'WB 02 DK 7788',
    plateExpected: 'WB 02 DK 7789',
    confidence: 91,
    at: atMinutes(-1),
    status: 'pending',
    paymentDue: 80,
    prebooked: false,
  },
  {
    id: 'gate_3',
    placeId: 'central',
    direction: 'entry',
    plateRead: 'WB 24 XY 3322',
    confidence: 88,
    at: atMinutes(-1),
    status: 'pending',
  },
  {
    id: 'gate_4',
    placeId: 'central',
    direction: 'exit',
    plateRead: 'WB 24 QR 9081',
    plateExpected: 'WB 24 QR 9081',
    confidence: 99,
    at: atMinutes(-1),
    status: 'pending',
    paymentDue: 120,
    prebooked: true,
  },
  {
    id: 'gate_5',
    placeId: 'north',
    direction: 'entry',
    plateRead: 'WB 24 AA 0101',
    plateExpected: 'WB 24 AA 0101',
    confidence: 96,
    at: atMinutes(-3),
    status: 'pending',
  },
  {
    id: 'gate_6',
    placeId: 'north',
    direction: 'exit',
    plateRead: 'WB 02 AB 7712',
    plateExpected: 'WB 02 AB 7712',
    confidence: 94,
    at: atMinutes(-2),
    status: 'pending',
    paymentDue: 50,
    prebooked: false,
  },
  {
    id: 'gate_7',
    placeId: 'metro',
    direction: 'entry',
    plateRead: 'WB 06 KL 2211',
    plateExpected: 'WB 06 KL 2212',
    confidence: 90,
    at: atMinutes(-5),
    status: 'pending',
  },
  {
    id: 'gate_8',
    placeId: 'central',
    direction: 'entry',
    plateRead: 'WB 06 AR 1234',
    plateExpected: 'WB 06 AR 1234',
    confidence: 98,
    at: atMinutes(-36),
    status: 'cleared',
    attendantId: 'u_attendant',
  },
  {
    id: 'gate_9',
    placeId: 'central',
    direction: 'exit',
    plateRead: 'WB 06 MN 4410',
    plateExpected: 'WB 06 MN 4410',
    confidence: 95,
    at: atMinutes(-22),
    status: 'cleared',
    attendantId: 'u_attendant',
  },
]

interface RawAudit {
  at: string
  actorId: string
  actorName: string
  actorRole: AuditEvent['actorRole']
  action: string
  target: string
  reason?: string
}

const rawAudit: RawAudit[] = [
  {
    at: atDays(-2),
    actorId: 'u_admin',
    actorName: 'Debargha Mitra',
    actorRole: 'admin',
    action: 'Updated confidence thresholds',
    target: 'Global fusion settings',
    reason: 'Tune confidence after monsoon sensor noise',
  },
  {
    at: atDays(-1.8),
    actorId: 'u_operator',
    actorName: 'Rituparna Ghosh',
    actorRole: 'operator',
    action: 'Acknowledged low-confidence alert',
    target: 'Park Street Centre · Bay B3',
    reason: 'Attendant asked to inspect the bay',
  },
  {
    at: atDays(-1.4),
    actorId: 'u_admin',
    actorName: 'Debargha Mitra',
    actorRole: 'admin',
    action: 'Updated hourly price',
    target: 'Salt Lake Sector V',
    reason: 'Weekend demand and mall validation',
  },
  {
    at: atDays(-1),
    actorId: 'system',
    actorName: 'Payment simulator',
    actorRole: 'system',
    action: 'Captured online pre-booking payment',
    target: 'PS-PRE-8F3K2M',
    reason: 'Customer checkout',
  },
  {
    at: atMinutes(-290),
    actorId: 'u_attendant',
    actorName: 'Sujit Das',
    actorRole: 'attendant',
    action: 'Opened cash shift',
    target: 'Park Street Centre · Shift 1',
    reason: 'Start of shift',
  },
  {
    at: atMinutes(-180),
    actorId: 'u_attendant',
    actorName: 'Sujit Das',
    actorRole: 'attendant',
    action: 'Collected cash payment',
    target: 'PS-CSH-4A7B2C · ₹60',
    reason: 'Exit payment · attendant assisted',
  },
  {
    at: atMinutes(-95),
    actorId: 'u_attendant',
    actorName: 'Sujit Das',
    actorRole: 'attendant',
    action: 'Collected cash payment',
    target: 'PS-CSH-9D4E6F · ₹80',
    reason: 'Exit payment · attendant assisted',
  },
  {
    at: atMinutes(-36),
    actorId: 'u_attendant',
    actorName: 'Sujit Das',
    actorRole: 'attendant',
    action: 'Confirmed ANPR entry',
    target: 'WB 06 AR 1234 · Park Street Centre',
    reason: 'Plate matched expected vehicle',
  },
  {
    at: atMinutes(-22),
    actorId: 'u_attendant',
    actorName: 'Sujit Das',
    actorRole: 'attendant',
    action: 'Confirmed ANPR exit',
    target: 'WB 06 MN 4410 · Park Street Centre',
    reason: 'Payment cleared · barrier opened',
  },
]

let previousHash = 'GENESIS'
const auditEvents: AuditEvent[] = rawAudit.map((event, index) => {
  const hash = computeAuditHash(previousHash, event)
  const fullEvent: AuditEvent = {
    id: `audit_${String(index + 1).padStart(3, '0')}`,
    ...event,
    prevHash: previousHash,
    hash,
  }
  previousHash = hash
  return fullEvent
})

export function createSeedData(): AppData {
  return {
    version: 1,
    seededAt: new Date().toISOString(),
    users,
    places,
    bays,
    sensors,
    vehicles,
    reservations: [adminReservation, completedReservation],
    sessions: [],
    payments: [
      adminPayment,
      completedPayment,
      failedPayment,
      refundedOriginal,
      refundPayment,
      ...cashPayments,
    ],
    receipts: [adminReceipt, completedReceipt, ...cashReceipts],
    paymentMethods,
    alerts,
    auditEvents,
    gateEvents,
    shifts: [shift],
    settings,
  }
}
