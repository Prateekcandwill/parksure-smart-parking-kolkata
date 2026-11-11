import type {
  AppData,
  Payment,
  PaymentMethod,
  PaymentMethodRecord,
  PaymentRequest,
  PaymentResult,
  Receipt,
  User,
} from '@/types'
import { delay, getDB, mutateDB } from '@/api/db'
import { appendAudit } from '@/api/audit'
import { paymentProviders } from '@/api/paymentProviders'
import { ref, uid } from '@/utils/id'
import { roundCurrency } from '@/utils/format'
import { upiSchema } from '@/utils/validation'

export class PaymentError extends Error {
  code: string
  payment?: Payment

  constructor(code: string, message: string, payment?: Payment) {
    super(message)
    this.name = 'PaymentError'
    this.code = code
    this.payment = payment
  }
}

export const paymentMethodNames: Record<PaymentMethod, string> = {
  upi: 'UPI',
  qr: 'UPI QR',
  card: 'Credit card',
  debit: 'Debit card',
  fastag: 'FASTag',
  cash: 'Cash',
}

export function getReceipt(receiptId: string): Receipt | undefined {
  return getDB().receipts.find((receipt) => receipt.id === receiptId)
}

export function getReceiptForPayment(paymentId: string): Receipt | undefined {
  return getDB().receipts.find((receipt) => receipt.paymentId === paymentId)
}

export function getUserPayments(userId: string): Payment[] {
  return getDB()
    .payments.filter((payment) => payment.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getPaymentMethods(userId: string): PaymentMethodRecord[] {
  return getDB().paymentMethods.filter((method) => method.userId === userId)
}

export function getFastagForPlate(userId: string, plate: string): PaymentMethodRecord | undefined {
  return getDB().paymentMethods.find(
    (method) => method.userId === userId && method.type === 'fastag' && method.linkedPlate === plate,
  )
}

function buildReceipt(
  draft: AppData,
  payment: Payment,
  user: User,
  request: PaymentRequest,
): Receipt {
  const base = roundCurrency(request.amount / 1.18)
  const cgst = roundCurrency(base * 0.09)
  const sgst = roundCurrency(request.amount - base - cgst)
  const sequence = String(draft.receipts.length + 1).padStart(4, '0')
  const receipt: Receipt = {
    id: uid('receipt'),
    number: `PS-R-${new Date().getFullYear()}-${sequence}`,
    paymentId: payment.id,
    issuedAt: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    plate: request.plate,
    placeName: request.placeName,
    lines: [
      {
        label: request.receiptLabel ?? `${paymentMethodNames[request.method]} payment`,
        amount: base,
      },
    ],
    subtotal: base,
    cgst,
    sgst,
    total: roundCurrency(request.amount),
    gstin: '19AABCP1234F1Z5',
    notes: 'Demo GST invoice. No real payment was processed by ParkSure.',
  }
  draft.receipts.push(receipt)
  return receipt
}

function addSavedMethod(draft: AppData, request: PaymentRequest): void {
  if (!request.meta?.saveMethod) return
  const existing = draft.paymentMethods.some((method) => {
    if (method.userId !== request.userId || method.type !== request.method) return false
    if (request.method === 'upi') return method.upiId === request.meta?.upiId
    return method.last4 === request.meta?.last4
  })
  if (existing) return

  const label =
    request.method === 'upi'
      ? 'UPI'
      : `${request.meta?.brand ?? 'Card'} ···· ${request.meta?.last4 ?? ''}`

  draft.paymentMethods.push({
    id: uid('pm'),
    userId: request.userId,
    type: request.method as PaymentMethodRecord['type'],
    label,
    detail:
      request.method === 'upi'
        ? (request.meta?.upiId ?? 'UPI ID')
        : `Expires ${request.meta?.expiry ?? '—'}`,
    upiId: request.meta?.upiId,
    brand: request.meta?.brand,
    last4: request.meta?.last4,
    isDefault: false,
  })
}

export async function processPayment(request: PaymentRequest): Promise<PaymentResult> {
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new PaymentError('invalid_amount', 'Enter a valid amount before paying.')
  }

  const db = getDB()
  const user = db.users.find((candidate) => candidate.id === request.userId)
  if (!user) throw new PaymentError('unknown_user', 'Your session could not be verified. Sign in again.')

  if (!db.settings.paymentMethods[request.method]) {
    throw new PaymentError(
      'method_disabled',
      `${paymentMethodNames[request.method]} is turned off by the administrator. Choose another method.`,
    )
  }

  if (request.method === 'cash' && (!request.allowCash || request.prebooked || request.context === 'prebook')) {
    throw new PaymentError(
      'cash_not_allowed',
      'Cash is not accepted for pre-booked slots. Use an online method.',
    )
  }

  if (request.method === 'upi' && request.meta?.upiId) {
    const parsed = upiSchema.safeParse(request.meta.upiId)
    if (!parsed.success) {
      throw new PaymentError('invalid_upi', parsed.error.issues[0]?.message ?? 'Enter a valid UPI ID.')
    }
  }

  const existing = db.payments.find(
    (payment) => payment.userId === request.userId && payment.idempotencyKey === request.idempotencyKey,
  )
  if (existing) {
    if (existing.status === 'success') {
      const receipt = getReceiptForPayment(existing.id)
      if (receipt) return { payment: existing, receipt }
    }
    throw new PaymentError('duplicate', 'This payment attempt has already been recorded. Start a fresh attempt.', existing)
  }

  const provider = paymentProviders[request.method]
  const outcome = await provider.authorize({ request, data: db })

  const paymentId = uid('pay')
  const now = new Date().toISOString()
  const basePayment: Payment = {
    id: paymentId,
    reference: ref(request.context === 'prebook' ? 'PS-PRE' : 'PS-PAY'),
    idempotencyKey: request.idempotencyKey,
    userId: request.userId,
    amount: roundCurrency(request.amount),
    method: request.method,
    status: outcome.ok ? 'success' : 'failed',
    kind: 'payment',
    context: request.context,
    createdAt: now,
    paidAt: outcome.ok ? now : undefined,
    attendantId: request.attendantId,
    shiftId: request.shiftId,
    meta: {
      ...request.meta,
      tagId: outcome.tagId ?? request.meta?.tagId,
    },
  }

  if (!outcome.ok) {
    mutateDB((draft) => {
      draft.payments.push(basePayment)
      appendAudit(draft, {
        actorId: request.actorId ?? user.id,
        actorName: request.actorName ?? user.name,
        actorRole: request.actorRole ?? 'driver',
        action: 'Payment failed',
        target: `${basePayment.reference} · ${paymentMethodNames[request.method]}`,
        reason: outcome.message ?? 'Simulated gateway decline',
      })
    })
    throw new PaymentError(
      outcome.code ?? 'gateway_declined',
      outcome.message ?? 'The payment did not go through. Try again or choose another method.',
      basePayment,
    )
  }

  let result!: PaymentResult
  mutateDB((draft) => {
    const receipt = buildReceipt(draft, basePayment, user, request)
    basePayment.receiptId = receipt.id
    draft.payments.push(basePayment)

    if (request.method === 'fastag' && outcome.balanceAfter !== undefined) {
      draft.paymentMethods = draft.paymentMethods.map((method) =>
        method.userId === request.userId && method.type === 'fastag'
          ? { ...method, balance: outcome.balanceAfter }
          : method,
      )
      draft.vehicles = draft.vehicles.map((vehicle) =>
        vehicle.userId === request.userId && vehicle.fastagId === outcome.tagId
          ? { ...vehicle, fastagBalance: outcome.balanceAfter }
          : vehicle,
      )
    }

    addSavedMethod(draft, request)

    if (request.method === 'cash' && request.shiftId) {
      draft.shifts = draft.shifts.map((shift) =>
        shift.id === request.shiftId
          ? {
              ...shift,
              cashCollected: roundCurrency(shift.cashCollected + request.amount),
              transactions: shift.transactions + 1,
            }
          : shift,
      )
    }

    appendAudit(draft, {
      actorId: request.actorId ?? user.id,
      actorName: request.actorName ?? user.name,
      actorRole: request.actorRole ?? 'driver',
      action: `Captured ${paymentMethodNames[request.method]} payment`,
      target: `${basePayment.reference} · ₹${request.amount.toFixed(2)}`,
      reason: request.receiptLabel ?? `${request.context} payment`,
    })

    result = { payment: basePayment, receipt }
  })

  await delay(80)
  return result
}

export async function refundPayment(input: {
  originalPaymentId: string
  percent: number
  actorId: string
  actorName: string
  actorRole: 'driver' | 'operator' | 'admin'
  reason: string
}): Promise<Payment> {
  await delay(420)
  let refunded!: Payment
  mutateDB((draft) => {
    const original = draft.payments.find((payment) => payment.id === input.originalPaymentId)
    if (!original || original.status !== 'success' || original.kind !== 'payment') {
      throw new PaymentError('refund_not_possible', 'This payment can no longer be refunded automatically.')
    }
    const amount = roundCurrency(original.amount * (input.percent / 100))
    original.status = 'refunded'
    refunded = {
      id: uid('pay'),
      reference: ref('PS-RFD'),
      idempotencyKey: uid('refund'),
      userId: original.userId,
      amount,
      method: original.method,
      status: 'success',
      kind: 'refund',
      context: original.context,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      meta: {
        originalPaymentId: original.id,
        refundPercent: input.percent,
      },
    }
    draft.payments.push(refunded)
    appendAudit(draft, {
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole,
      action: 'Issued partial refund',
      target: `${refunded.reference} · ₹${amount.toFixed(2)}`,
      reason: input.reason,
    })
  })
  return refunded
}

export async function addPaymentMethod(input: {
  userId: string
  type: PaymentMethodRecord['type']
  label: string
  detail: string
  upiId?: string
  brand?: string
  last4?: string
}): Promise<PaymentMethodRecord> {
  await delay(300)
  const method: PaymentMethodRecord = {
    id: uid('pm'),
    ...input,
    isDefault: false,
  }
  mutateDB((draft) => {
    draft.paymentMethods.push(method)
  })
  return method
}

export async function removePaymentMethod(methodId: string): Promise<void> {
  await delay(260)
  mutateDB((draft) => {
    draft.paymentMethods = draft.paymentMethods.filter((method) => method.id !== methodId)
  })
}

export async function setDefaultPaymentMethod(userId: string, methodId: string): Promise<void> {
  await delay(200)
  mutateDB((draft) => {
    draft.paymentMethods = draft.paymentMethods.map((method) =>
      method.userId === userId ? { ...method, isDefault: method.id === methodId } : method,
    )
  })
}

export async function updateFastagBalance(userId: string, plate: string, balance: number): Promise<void> {
  await delay(240)
  mutateDB((draft) => {
    draft.paymentMethods = draft.paymentMethods.map((method) =>
      method.userId === userId && method.type === 'fastag' && method.linkedPlate === plate
        ? { ...method, balance }
        : method,
    )
    draft.vehicles = draft.vehicles.map((vehicle) =>
      vehicle.userId === userId && vehicle.plate === plate ? { ...vehicle, fastagBalance: balance } : vehicle,
    )
  })
}
