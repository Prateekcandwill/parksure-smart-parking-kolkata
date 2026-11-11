import type { AppData, Role, User } from '@/types'
import { getPlaceSummary } from '@/api/places'
import { formatCurrency, formatDateTime, formatDuration, minutesBetween } from '@/utils/format'
import { DEMO_CONFIG } from '@/config/env'

/**
 * ParkSure Assist — a deterministic, on-device support engine.
 *
 * It never calls an external AI service. Answers come from a curated help
 * library plus the live demo state (active booking, prices, wallet, alerts).
 * This keeps support fast, offline-capable and private: chat text never leaves
 * the browser.
 */

export interface SupportPlace {
  id: string
  name: string
  area: string
  freeBays: number
  totalBays: number
  pricePerHour: number
  basePricePerHour: number
  pricingLabel: string
  pricingReason: string
  distanceKm: number
}

export interface SupportBooking {
  placeName: string
  bayLabel?: string
  status: string
  startAt: string
  endAt: string
  amount: number
  type: string
}

export interface SupportSession {
  placeName: string
  bayLabel?: string
  entryAt: string
  amount: number
}

export interface SupportContext {
  user?: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'roles'>
  role?: Role
  places: SupportPlace[]
  activeBooking?: SupportBooking
  activeSession?: SupportSession
  vehicle?: { plate: string; make: string; model: string; fastagBalance?: number }
  receiptCount: number
  paymentMethods: string[]
  openAlerts: number
  pendingGate: number
  auditEvents: number
  activeShift?: { cashCollected: number; transactions: number }
  pendingCash: number
}

export interface SupportSuggestion {
  label: string
  prompt: string
}

export interface SupportAnswer {
  topic: string
  text: string
  suggestions: SupportSuggestion[]
  confidence: number
}

function placeName(places: SupportPlace[], placeId: string): string {
  return places.find((place) => place.id === placeId)?.name ?? 'your parking place'
}

export function buildSupportContext(user: User | undefined, role: Role | undefined, db: AppData): SupportContext {
  const places = db.places
    .filter((place) => place.active)
    .map((place) => {
      const summary = getPlaceSummary(place)
      return {
        id: summary.id,
        name: summary.name,
        area: summary.address.split(',')[0] ?? summary.name,
        freeBays: summary.freeBays,
        totalBays: summary.totalBays,
        pricePerHour: summary.pricePerHour,
        basePricePerHour: summary.basePricePerHour,
        pricingLabel: summary.pricingLabel,
        pricingReason: summary.pricingReason,
        distanceKm: summary.distanceKm,
      }
    })

  const reservation = user
    ? db.reservations
        .filter(
          (candidate) =>
            candidate.userId === user.id &&
            (candidate.status === 'active' || candidate.status === 'upcoming'),
        )
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0]
    : undefined

  const bay = reservation ? db.bays.find((candidate) => candidate.id === reservation.bayId) : undefined
  const session = user
    ? db.sessions.find(
        (candidate) =>
          candidate.status === 'active' &&
          (candidate.reservationId === reservation?.id ||
            db.vehicles.some((vehicle) => vehicle.userId === user.id && vehicle.plate === candidate.plate)),
      )
    : undefined
  const sessionBay = session?.bayId ? db.bays.find((candidate) => candidate.id === session.bayId) : undefined

  const vehicles = user ? db.vehicles.filter((vehicle) => vehicle.userId === user.id) : []
  const vehicle = vehicles.find((candidate) => candidate.isDefault) ?? vehicles[0]
  const methods = user ? db.paymentMethods.filter((method) => method.userId === user.id) : []

  const scopedAlerts = db.alerts.filter(
    (alert) =>
      alert.status === 'open' &&
      (!user || user.roles.includes('admin') || user.placeIds.length === 0 || user.placeIds.includes(alert.placeId)),
  )
  const scopedGates = db.gateEvents.filter(
    (event) =>
      event.status === 'pending' &&
      (!user || user.roles.includes('admin') || user.placeIds.length === 0 || user.placeIds.includes(event.placeId)),
  )
  const shift = user ? db.shifts.find((candidate) => candidate.attendantId === user.id && candidate.status === 'open') : undefined

  return {
    user: user
      ? { id: user.id, name: user.name, email: user.email, phone: user.phone, roles: user.roles }
      : undefined,
    role,
    places,
    activeBooking: reservation
      ? {
          placeName: placeName(places, reservation.placeId),
          bayLabel: bay?.label,
          status: reservation.status,
          startAt: reservation.startAt,
          endAt: reservation.endAt,
          amount: reservation.amount,
          type: reservation.type,
        }
      : undefined,
    activeSession: session
      ? {
          placeName: placeName(places, session.placeId),
          bayLabel: sessionBay?.label,
          entryAt: session.entryAt,
          amount: session.amount,
        }
      : undefined,
    vehicle: vehicle
      ? {
          plate: vehicle.plate,
          make: vehicle.make,
          model: vehicle.model,
          fastagBalance: vehicle.fastagBalance,
        }
      : undefined,
    receiptCount: user ? db.receipts.filter((receipt) => receipt.userId === user.id).length : 0,
    paymentMethods: methods.map((method) => method.label),
    openAlerts: scopedAlerts.length,
    pendingGate: scopedGates.length,
    auditEvents: db.auditEvents.length,
    activeShift: shift ? { cashCollected: shift.cashCollected, transactions: shift.transactions } : undefined,
    pendingCash: db.shifts.filter((candidate) => candidate.status === 'closed' && !candidate.reconciledAt).length,
  }
}

function firstName(ctx: SupportContext): string {
  return ctx.user?.name.split(' ')[0] ?? 'there'
}

function bookingLine(ctx: SupportContext): string {
  if (ctx.activeSession) {
    return `You are currently parked at ${ctx.activeSession.placeName}${
      ctx.activeSession.bayLabel ? `, bay ${ctx.activeSession.bayLabel}` : ''
    } since ${formatDateTime(ctx.activeSession.entryAt)}.`
  }
  if (ctx.activeBooking) {
    return `Your ${ctx.activeBooking.status} booking is at ${ctx.activeBooking.placeName}${
      ctx.activeBooking.bayLabel ? `, bay ${ctx.activeBooking.bayLabel}` : ''
    } from ${formatDateTime(ctx.activeBooking.startAt)} to ${formatDateTime(ctx.activeBooking.endAt)}.`
  }
  return 'You do not have an active or upcoming booking right now.'
}

function placesLine(ctx: SupportContext): string {
  if (ctx.places.length === 0) return 'No places are active in this demo.'
  return ctx.places
    .slice(0, 3)
    .map(
      (place) =>
        `${place.name} (${place.freeBays} free, ${formatCurrency(place.pricePerHour)}/hr, ${place.distanceKm} km)`,
    )
    .join('; ')
}

function walletLine(ctx: SupportContext): string {
  const parts: string[] = []
  if (ctx.vehicle?.fastagBalance !== undefined) {
    parts.push(`FASTag ${ctx.vehicle.plate} has ${formatCurrency(ctx.vehicle.fastagBalance)}`)
  }
  if (ctx.paymentMethods.length > 0) {
    parts.push(`saved methods: ${ctx.paymentMethods.join(', ')}`)
  }
  parts.push(`${ctx.receiptCount} receipt${ctx.receiptCount === 1 ? '' : 's'} in your wallet`)
  return parts.join(' · ')
}

function staffLine(ctx: SupportContext): string {
  const parts = [`${ctx.openAlerts} open alert${ctx.openAlerts === 1 ? '' : 's'}`]
  if (ctx.pendingGate > 0) parts.push(`${ctx.pendingGate} gate decision${ctx.pendingGate === 1 ? '' : 's'} waiting`)
  if (ctx.activeShift) {
    parts.push(
      `cash shift ${formatCurrency(ctx.activeShift.cashCollected)} across ${ctx.activeShift.transactions} transactions`,
    )
  }
  if (ctx.pendingCash > 0) parts.push(`${ctx.pendingCash} shift${ctx.pendingCash === 1 ? '' : 's'} awaiting reconciliation`)
  return parts.join(' · ')
}

interface KnowledgeEntry {
  id: string
  keywords: string[]
  roles?: Role[]
  answer: (ctx: SupportContext) => string
  followUps?: SupportSuggestion[]
}

const entries: KnowledgeEntry[] = [
  {
    id: 'booking',
    keywords: ['book', 'booking', 'reserve', 'reservation', 'prebook', 'pre-book', 'slot', 'bay', 'park now'],
    answer: (ctx) =>
      `Open Find, choose a Kolkata place, then tap Book now or Pre-book. Pick a duration and vehicle, review the live rate and GST, pay, and reveal the parking pass. ${bookingLine(ctx)}`,
    followUps: [
      { label: 'How do I pay?', prompt: 'How do payments work?' },
      { label: 'Can I cancel?', prompt: 'How do I cancel a booking and get a refund?' },
    ],
  },
  {
    id: 'cancel',
    keywords: ['cancel', 'cancellation', 'call off', 'abort booking'],
    answer: () =>
      'Open Trip, select the booking and choose Cancel. Upcoming bookings are released immediately; active sessions may settle an overstay charge before they close. The cancellation and any refund are recorded in the audit trail and your wallet.',
    followUps: [{ label: 'Refund timing', prompt: 'How do refunds work?' }],
  },
  {
    id: 'refund',
    keywords: ['refund', 'money back', 'reversal', 'refunded', 'charge back'],
    answer: (ctx) =>
      `Refunds are simulated. A refund appears as a separate ledger entry and the original payment is marked refunded. Open Wallet to see receipts and refunds. ${walletLine(ctx)}`,
    followUps: [{ label: 'Open wallet help', prompt: 'What is in my wallet?' }],
  },
  {
    id: 'extend',
    keywords: ['extend', 'overstay', 'overtime', 'extra time', 'time up', 'session end', 'late'],
    answer: () =>
      'On the Trip screen, use Extend before the timer ends. If you overstay, the exit flow calculates the additional time at the live rate plus GST and asks you to settle it before the gate clears. The demo never charges a real card.',
    followUps: [{ label: 'Exit help', prompt: 'How do I exit the car park?' }],
  },
  {
    id: 'payment',
    keywords: ['pay', 'payment', 'upi', 'qr', 'card', 'debit', 'credit', 'fastag', 'cash', '3d secure', '3-d secure', 'otp'],
    answer: () =>
      'Payments use slide-to-pay. UPI and UPI QR need a valid UPI ID, cards use Luhn, expiry and CVV checks, FASTag checks the linked tag and balance, and cash is attendant-assisted only. Card payments ask for the demo 3-D Secure code. Every attempt is idempotent and produces a GST receipt on success.',
    followUps: [
      { label: 'Payment failed', prompt: 'Why did my payment fail?' },
      { label: 'Receipts', prompt: 'Where is my GST receipt?' },
    ],
  },
  {
    id: 'receipt',
    keywords: ['receipt', 'invoice', 'gst', 'pdf', 'tax', 'bill', 'gstin'],
    answer: (ctx) =>
      `Open Wallet → Payments & passes and choose a successful payment to see the GST breakdown and download the PDF. Receipts use 9% CGST + 9% SGST and the demo GSTIN 19AABCP1234F1Z5. ${ctx.receiptCount} receipt${ctx.receiptCount === 1 ? '' : 's'} are linked to your account.`,
    followUps: [{ label: 'Refunds', prompt: 'How do refunds work?' }],
  },
  {
    id: 'pricing',
    keywords: ['price', 'pricing', 'rate', 'dynamic', 'surge', 'peak', 'cheap', 'cost', 'expensive', 'tariff'],
    answer: (ctx) =>
      `The hourly rate is dynamic. Occupancy bands and Kolkata peak windows adjust the base rate, then the result is clamped to 0.85–1.60× and rounded to ₹5. ${placesLine(ctx)}. The Book screen shows the base rate, multiplier, reason and GST before you pay.`,
    followUps: [
      { label: 'Why is it higher?', prompt: 'Why did the price go up?' },
      { label: 'Cheapest place', prompt: 'Which place is cheapest right now?' },
    ],
  },
  {
    id: 'map',
    keywords: ['map', 'direction', 'directions', 'navigate', 'navigation', 'route', 'location', 'how far', 'near me'],
    answer: () =>
      'Find has a List/Map toggle. The map uses OpenStreetMap data with CARTO tiles, colour-coded pins, a locate-me button and live rate tooltips. Place detail and Trip include a Navigate button that opens OpenStreetMap driving directions in a new tab or the native browser.',
    followUps: [{ label: 'Places nearby', prompt: 'Which places are nearby?' }],
  },
  {
    id: 'pass',
    keywords: ['pass', 'parking pass', 'scratch', 'reveal', 'qr code', 'show pass', 'entry code'],
    answer: () =>
      'After payment, the pass is revealed with a scratch-to-reveal interaction. It shows the place, bay, plate, timer and a QR-style pass. Keep it visible until you exit; the attendant gate console can confirm the plate.',
    followUps: [{ label: 'Gate entry', prompt: 'How does the gate work?' }],
  },
  {
    id: 'trip',
    keywords: ['trip', 'timer', 'active parking', 'current session', 'my parking', 'live pass'],
    answer: (ctx) => `Trip shows your live pass, timer, embedded map and exit controls. ${bookingLine(ctx)}`,
    followUps: [
      { label: 'Extend time', prompt: 'How do I extend my parking?' },
      { label: 'Exit', prompt: 'How do I exit the car park?' },
    ],
  },
  {
    id: 'wallet',
    keywords: ['wallet', 'balance', 'top up', 'topup', 'saved method', 'payment method', 'fastag balance'],
    answer: (ctx) => `Wallet holds saved methods, FASTag balance and top-up, payments, GST receipts and refunds. ${walletLine(ctx)}`,
    followUps: [{ label: 'Add a card', prompt: 'How do I add a payment method?' }],
  },
  {
    id: 'profile',
    keywords: ['profile', 'edit name', 'change name', 'email', 'phone', 'avatar', 'my details', 'account details'],
    answer: () =>
      'Open Me → Edit profile. You can change your name, email, mobile number and avatar tone. The form validates Indian mobile numbers and duplicate emails/phones, then writes an audit event. The change applies to every workspace on the account.',
    followUps: [{ label: 'Audit trail', prompt: 'Where is the audit trail?' }],
  },
  {
    id: 'account',
    keywords: ['sign in', 'signin', 'login', 'log in', 'otp', 'password', 'register', 'create account', 'forgot'],
    answer: () =>
      `Use the demo accounts on the sign-in screen. OTP is ${DEMO_CONFIG.otp} and the password is ${DEMO_CONFIG.password}. “Remember this device” keeps the session in local storage; otherwise it lives in the tab. There is no real OTP delivery, so nothing is sent to your phone or inbox.`,
    followUps: [
      { label: 'Switch role', prompt: 'How do I switch roles?' },
      { label: 'Create account', prompt: 'How do I create a driver account?' },
    ],
  },
  {
    id: 'roles',
    keywords: ['role', 'switch role', 'workspace', 'permission', 'locked', 'admin', 'attendant', 'operator', 'driver'],
    answer: (ctx) =>
      `One login can hold several roles. The role chooser unlocks only the roles on the account; others stay visibly locked. ${ctx.role ? `You are currently in the ${ctx.role} workspace.` : 'Sign in to choose a workspace.'} Switch role from Me or the role chooser.`,
    followUps: [{ label: 'What can each role do?', prompt: 'What does each role do?' }],
  },
  {
    id: 'gate',
    keywords: ['gate', 'anpr', 'barrier', 'plate mismatch', 'scan', 'entry', 'exit gate', 'refuse', 'confirm plate'],
    answer: () =>
      'The attendant gate console shows the ANPR read, expected plate, confidence and payment status. Confirm when the plate matches, refuse a mismatch, or collect cash for an exit. Every decision is written to the gate log and, where relevant, the audit trail. Refuse if the plate is clearly wrong or payment is outstanding.',
    followUps: [
      { label: 'Low confidence', prompt: 'What should I do for a low-confidence plate read?' },
      { label: 'Cash collection', prompt: 'How does cash collection work?' },
    ],
  },
  {
    id: 'sensor',
    keywords: ['sensor', 'offline', 'battery', 'low confidence', 'unknown bay', 'camera', 'fusion'],
    answer: (ctx) =>
      `Sensor fusion combines magnetometer readings, camera estimates and confidence. A bay below the free threshold is not offered for reservation, and offline or low-battery sensors raise an alert for the operator. ${staffLine(ctx)}. Open the lot map to inspect the affected bay and reassign or resolve it.`,
    followUps: [{ label: 'Resolve alert', prompt: 'How do I resolve an alert?' }],
  },
  {
    id: 'cash',
    keywords: ['cash', 'shift', 'reconciliation', 'reconcile', 'variance', 'float', 'counted'],
    answer: (ctx) =>
      `Cash is attendant-assisted. Successful cash payments roll into the active shift; at close, the operator counts the drawer, records the variance and reconciles the shift. ${staffLine(ctx)}. A reason is required when the counted amount differs from the expected total.`,
    followUps: [{ label: 'Open reconciliation', prompt: 'Where is cash reconciliation?' }],
  },
  {
    id: 'audit',
    keywords: ['audit', 'hash', 'chain', 'verify', 'tamper', 'trail', 'governance'],
    answer: (ctx) =>
      `Every sensitive action is appended to a hash-chained audit trail. Admin → Audit trail shows the previous hash, current hash, actor, target and reason; the Verify chain button recomputes the chain and records the result. ${ctx.auditEvents} events are currently stored.`,
    followUps: [{ label: 'Admin settings', prompt: 'What can an admin change?' }],
  },
  {
    id: 'settings',
    keywords: ['settings', 'threshold', 'payment methods', 'retention', 'reset demo', 'people', 'places', 'admin change'],
    answer: () =>
      'Admin → Settings controls confidence thresholds, enabled payment methods, privacy retention text, people, places and demo reset. Sensitive changes are reason-gated and audited. Disabling a payment method removes it from the payment sheet immediately.',
    followUps: [{ label: 'Audit trail', prompt: 'Where is the audit trail?' }],
  },
  {
    id: 'alerts',
    keywords: ['alert', 'exception', 'acknowledge', 'assign', 'resolve', 'queue', 'ticket'],
    answer: (ctx) =>
      `Open Alerts to acknowledge, assign or resolve exceptions. ${staffLine(ctx)}. Each change records the operator and time so the event trail stays explainable.`,
    followUps: [{ label: 'Sensor faults', prompt: 'What does a sensor offline alert mean?' }],
  },
  {
    id: 'privacy',
    keywords: ['privacy', 'data', 'retention', 'consent', 'gdpr', 'dpdp', 'delete my data', 'personal information'],
    answer: () =>
      'ParkSure stores the demo in your browser. There is no ParkSure account server. Optional analytics are off until you opt in, and chat text never leaves the device. Read the Privacy policy for the storage keys, retention, third-party map/font requests and your choices.',
    followUps: [{ label: 'Cookie choices', prompt: 'How do I change cookie or analytics consent?' }],
  },
  {
    id: 'consent',
    keywords: ['cookie', 'cookies', 'analytics consent', 'tracking', 'opt out', 'opt in', 'privacy choices'],
    answer: () =>
      'Use the privacy banner or Me → Cookie preferences. “Accept all” enables local, opt-in analytics; “Essential only” keeps just the session, preferences and demo database. You can withdraw consent at any time and clear the analytics log in Admin → Usage analytics.',
    followUps: [{ label: 'Analytics', prompt: 'What analytics do you collect?' }],
  },
  {
    id: 'analytics',
    keywords: ['analytics', 'usage', 'stats', 'page views', 'metrics', 'tracking data'],
    answer: (ctx) =>
      `Analytics are privacy-first and local. With consent, ParkSure records page views and action names (never chat text or payment details). Admin → Usage analytics shows totals, top routes and the last seven days. ${ctx.user?.roles.includes('admin') ? 'You can clear the local log there.' : 'Only administrators can open that view.'}`,
    followUps: [{ label: 'Privacy policy', prompt: 'Where is the privacy policy?' }],
  },
  {
    id: 'language',
    keywords: ['language', 'bengali', 'bangla', 'hindi', 'english', 'translate', 'i18n'],
    answer: () =>
      'Open Me → Preferences → Language. English, বাংলা and हिन्दी are available, and the choice is remembered. Navigation, shared actions and common status labels are translated; long-form legal and operational copy stays in English in this build.',
    followUps: [{ label: 'Accessibility', prompt: 'Is the app accessible?' }],
  },
  {
    id: 'android',
    keywords: ['android', 'apk', 'install', 'native', 'phone', 'app', 'pwa', 'offline'],
    answer: () =>
      'The same web build ships as an installable PWA and as a Capacitor Android app. Install the APK from the releases folder, or use “Add to home screen” in a supported browser. The app shell opens offline; map tiles and navigation need a network connection.',
    followUps: [{ label: 'Same features?', prompt: 'Does the Android app have the same features as the web app?' }],
  },
  {
    id: 'parity',
    keywords: ['same features', 'parity', 'android web', 'web app android', 'ui same'],
    answer: () =>
      'Yes. The web app and Android app run the same React build, the same components and the same local API. The APK packages the current dist/ output, so routes, profile editing, ParkSure Assist, legal pages and the launch-readiness features are identical. Only native chrome (status bar, splash, external browser hand-off) differs.',
    followUps: [{ label: 'Install Android', prompt: 'How do I install the Android app?' }],
  },
  {
    id: 'demo',
    keywords: ['demo', 'simulated', 'fake', 'real data', 'real money', 'sensor', 'prototype'],
    answer: () =>
      'Everything is simulated: sensors, cameras, ANPR, barriers, maps, prices, bookings, payments, refunds and GST invoices. The app says “Demo mode: simulated data” throughout. Nothing is sent to a real parking operator, bank or payment network.',
    followUps: [{ label: 'Privacy', prompt: 'What data is stored?' }],
  },
  {
    id: 'accessibility',
    keywords: ['accessibility', 'screen reader', 'keyboard', 'contrast', 'touch target', 'reduced motion', 'font size', 'a11y'],
    answer: () =>
      'The app uses semantic landmarks, a skip link, labelled controls, visible focus rings, keyboard-operable sheets and 48px touch targets (72px on the gate console). Status always pairs colour with text or an icon, and reduced-motion preferences disable large motion. Dark and light themes are contrast-checked.',
    followUps: [{ label: 'Light theme', prompt: 'How do I switch to the light theme?' }],
  },
  {
    id: 'places',
    keywords: ['place', 'places', 'nearby', 'park street', 'salt lake', 'howrah', 'victoria', 'maidan', 'kolkata'],
    answer: (ctx) =>
      `The demo network covers Park Street Centre, Salt Lake Sector V, Howrah Station Forecourt and Maidan – Victoria Memorial. Current snapshot: ${placesLine(ctx)}.`,
    followUps: [{ label: 'Prices', prompt: 'How does dynamic pricing work?' }],
  },
  {
    id: 'vehicle',
    keywords: ['vehicle', 'car', 'plate', 'number plate', 'add vehicle', 'fastag'],
    answer: (ctx) =>
      `Vehicles are linked to your driver account. ${ctx.vehicle ? `Your default vehicle is ${ctx.vehicle.plate} (${ctx.vehicle.make} ${ctx.vehicle.model}).` : 'You can register a vehicle when you create a driver account.'} Plates are validated and formatted as West Bengal-style plates in the demo.`,
    followUps: [{ label: 'FASTag', prompt: 'How does FASTag work?' }],
  },
  {
    id: 'exit',
    keywords: ['exit', 'leave', 'gate out', 'checkout', 'check out', 'close session'],
    answer: () =>
      'Open Trip and choose Exit. The app calculates the final amount, applies the live rate and GST, and asks you to settle any overstay. After payment the session closes, the bay is released and the receipt appears in Wallet. The attendant gate console can also clear the exit.',
    followUps: [{ label: 'Overstay', prompt: 'What happens if I overstay?' }],
  },
  {
    id: 'human',
    keywords: ['human', 'agent', 'person', 'call', 'contact', 'phone number', 'email support', 'talk to someone'],
    answer: () =>
      'This is a demo, so there is no live support queue. ParkSure Assist is on-device and can answer from the built-in help library. For project questions, use the support email in the footer of the legal pages. In a real deployment this is where a human hand-off would appear.',
    followUps: [{ label: 'What can you do?', prompt: 'What can you help me with?' }],
  },
]

export const starterPrompts: Record<Role | 'guest', SupportSuggestion[]> = {
  guest: [
    { label: 'What is ParkSure?', prompt: 'What is ParkSure and what can I do here?' },
    { label: 'Demo accounts', prompt: 'How do I sign in to the demo?' },
    { label: 'Is my data private?', prompt: 'What data does ParkSure store?' },
    { label: 'Android app', prompt: 'How do I install the Android app?' },
  ],
  driver: [
    { label: 'Book a bay', prompt: 'How do I book a parking bay?' },
    { label: 'Why did the price change?', prompt: 'Why did the price go up?' },
    { label: 'My pass', prompt: 'Where is my parking pass?' },
    { label: 'Refunds', prompt: 'How do refunds work?' },
  ],
  attendant: [
    { label: 'Plate mismatch', prompt: 'How do I handle a plate mismatch at the gate?' },
    { label: 'Cash collection', prompt: 'How does cash collection work?' },
    { label: 'Low confidence read', prompt: 'What should I do for a low-confidence plate read?' },
    { label: 'Refuse entry', prompt: 'When should I refuse entry?' },
  ],
  operator: [
    { label: 'Resolve an alert', prompt: 'How do I resolve an alert?' },
    { label: 'Sensor offline', prompt: 'What does a sensor offline alert mean?' },
    { label: 'Cash reconciliation', prompt: 'How does cash reconciliation work?' },
    { label: 'Read the lot map', prompt: 'How do I read the live lot map?' },
  ],
  admin: [
    { label: 'Verify audit chain', prompt: 'How do I verify the audit chain?' },
    { label: 'Change thresholds', prompt: 'How do thresholds affect bay availability?' },
    { label: 'Payment methods', prompt: 'How do I change enabled payment methods?' },
    { label: 'Usage analytics', prompt: 'What analytics do you collect?' },
  ],
}

const fallbackSuggestions: SupportSuggestion[] = [
  { label: 'Book a bay', prompt: 'How do I book a parking bay?' },
  { label: 'Payments', prompt: 'How do payments work?' },
  { label: 'Pricing', prompt: 'How does dynamic pricing work?' },
  { label: 'Privacy', prompt: 'What data does ParkSure store?' },
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreEntry(entry: KnowledgeEntry, normalized: string, tokens: Set<string>, role?: Role): number {
  let score = 0
  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalize(keyword)
    if (!normalizedKeyword) continue
    if (normalized.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(' ') ? 5 : 3
    }
    for (const token of normalizedKeyword.split(' ')) {
      if (token.length > 2 && tokens.has(token)) score += 1
    }
  }
  if (entry.roles && role) {
    score += entry.roles.includes(role) ? 3 : -3
  }
  return score
}

function greeting(ctx: SupportContext): SupportAnswer {
  return {
    topic: 'greeting',
    text: `Hi ${firstName(ctx)}. I'm ParkSure Assist, an on-device helper for this demo. I can explain bookings, dynamic pricing, payments, receipts, the gate, lot operations, the audit trail, privacy and launch features. What would you like to know?`,
    suggestions: starterPrompts[ctx.role ?? 'guest'],
    confidence: 100,
  }
}

function capabilities(ctx: SupportContext): SupportAnswer {
  return {
    topic: 'capabilities',
    text: `I answer from a built-in ParkSure help library plus your live demo context, so nothing is sent to an external AI. I can help with booking and cancelling, prices, payments and refunds, parking passes, maps, profile editing, the attendant gate, operator alerts, cash reconciliation, admin settings, the audit trail, privacy, accessibility, analytics and the Android build. ${
      ctx.role ? `You're in the ${ctx.role} workspace.` : ''
    }`,
    suggestions: starterPrompts[ctx.role ?? 'guest'],
    confidence: 100,
  }
}

export function askSupport(question: string, ctx: SupportContext): SupportAnswer {
  const normalized = normalize(question)
  if (!normalized) return greeting(ctx)

  if (/^(hi|hello|hey|namaskar|namaste|good (morning|afternoon|evening))\b/.test(normalized)) {
    return greeting(ctx)
  }
  if (/\b(thanks|thank you|thx|great|perfect|helpful)\b/.test(normalized) && normalized.split(' ').length <= 4) {
    return {
      topic: 'thanks',
      text: 'Happy to help. Ask me anything else about the demo, or open the relevant workspace from the bottom navigation.',
      suggestions: starterPrompts[ctx.role ?? 'guest'].slice(0, 3),
      confidence: 100,
    }
  }
  if (
    /\b(what can you do|what can you help|how can you help|capabilities|help me|what do you know|who are you)\b/.test(
      normalized,
    )
  ) {
    return capabilities(ctx)
  }

  const tokens = new Set(normalized.split(' ').filter((token) => token.length > 1))
  let best: { entry: KnowledgeEntry; score: number } | undefined
  for (const entry of entries) {
    const score = scoreEntry(entry, normalized, tokens, ctx.role)
    if (!best || score > best.score) best = { entry, score }
  }

  if (!best || best.score < 3) {
    return {
      topic: 'fallback',
      text: `I couldn't match that to a help topic yet. I'm a deterministic on-device assistant, so I work best with questions about bookings, prices, payments, receipts, passes, maps, the gate, alerts, cash reconciliation, audit, profile, privacy, analytics or the Android app. ${bookingLine(
        ctx,
      )}`,
      suggestions: fallbackSuggestions,
      confidence: best ? Math.min(45, 20 + best.score * 5) : 0,
    }
  }

  return {
    topic: best.entry.id,
    text: best.entry.answer(ctx),
    suggestions: best.entry.followUps ?? starterPrompts[ctx.role ?? 'guest'].slice(0, 3),
    confidence: Math.min(99, 55 + best.score * 5),
  }
}

export function contextSummary(ctx: SupportContext): string {
  if (ctx.role === 'driver') {
    return ctx.activeSession
      ? `Parked at ${ctx.activeSession.placeName} · ${formatDuration(minutesBetween(ctx.activeSession.entryAt, Date.now()))} so far`
      : ctx.activeBooking
        ? `Booking at ${ctx.activeBooking.placeName} · starts ${formatDateTime(ctx.activeBooking.startAt)}`
        : 'No active parking · ready to find a bay'
  }
  if (ctx.role) {
    return staffLine(ctx)
  }
  return 'Guest mode · sign in for live booking context'
}
