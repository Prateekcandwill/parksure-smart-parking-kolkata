import type { AppData, PaymentMethod, PaymentRequest } from '@/types'
import { delay } from '@/api/db'
import { upiSchema } from '@/utils/validation'

export interface ProviderOutcome {
  ok: boolean
  code?: 'gateway_declined' | 'insufficient_balance' | 'tag_not_found' | 'invalid_upi' | 'invalid_card' | 'cash_not_allowed' | 'method_disabled'
  message?: string
  tagId?: string
  balanceAfter?: number
}

export interface ProviderInput {
  request: PaymentRequest
  data: AppData
}

export interface PaymentProvider {
  id: PaymentMethod
  label: string
  authorize(input: ProviderInput): Promise<ProviderOutcome>
}

function fastagRecord(input: ProviderInput) {
  const { request, data } = input
  return data.paymentMethods.find(
    (method) =>
      method.userId === request.userId &&
      method.type === 'fastag' &&
      (method.tagId === request.meta?.tagId ||
        (request.plate && method.linkedPlate === request.plate)),
  )
}

const fastagProvider: PaymentProvider = {
  id: 'fastag',
  label: 'FASTag',
  async authorize(input) {
    await delay(650)
    const record = fastagRecord(input)
    if (!record) {
      return {
        ok: false,
        code: 'tag_not_found',
        message: 'No FASTag is linked to this vehicle. Choose another payment method.',
      }
    }
    const balance = record.balance ?? 0
    if (balance < input.request.amount) {
      return {
        ok: false,
        code: 'insufficient_balance',
        message: `FASTag balance is ${balance.toFixed(0)}. ${input.request.amount.toFixed(0)} is needed. Choose another method.`,
      }
    }
    return { ok: true, tagId: record.tagId, balanceAfter: Math.round((balance - input.request.amount) * 100) / 100 }
  },
}

const upiProvider: PaymentProvider = {
  id: 'upi',
  label: 'UPI',
  async authorize(input) {
    await delay(700)
    if (input.request.meta?.simulatedFailure) {
      return {
        ok: false,
        code: 'gateway_declined',
        message: 'The UPI collect request was declined by the simulated bank. Try again or use another method.',
      }
    }
    if (input.request.meta?.upiId) {
      const parsed = upiSchema.safeParse(input.request.meta.upiId)
      if (!parsed.success) {
        return { ok: false, code: 'invalid_upi', message: parsed.error.issues[0]?.message }
      }
    }
    return { ok: true }
  },
}

const qrProvider: PaymentProvider = {
  id: 'qr',
  label: 'UPI QR',
  async authorize(input) {
    await delay(550)
    if (input.request.meta?.simulatedFailure) {
      return {
        ok: false,
        code: 'gateway_declined',
        message: 'No payment was detected before the QR expired. Generate a new QR or choose another method.',
      }
    }
    return { ok: true }
  },
}

const cardProvider: PaymentProvider = {
  id: 'card',
  label: 'Credit card',
  async authorize(input) {
    await delay(750)
    if (input.request.meta?.simulatedFailure) {
      return {
        ok: false,
        code: 'gateway_declined',
        message: 'The simulated bank declined this card. Try another card or payment method.',
      }
    }
    if (!/^\d{4}$/.test(input.request.meta?.last4 ?? '')) {
      return { ok: false, code: 'invalid_card', message: 'Card details could not be verified. Re-enter the card.' }
    }
    return { ok: true }
  },
}

const debitProvider: PaymentProvider = {
  ...cardProvider,
  id: 'debit',
  label: 'Debit card',
}

const cashProvider: PaymentProvider = {
  id: 'cash',
  label: 'Cash',
  async authorize(input) {
    await delay(320)
    if (!input.request.allowCash || input.request.prebooked || input.request.context === 'prebook') {
      return {
        ok: false,
        code: 'cash_not_allowed',
        message: 'Cash is not accepted for pre-booked slots. Use an online method.',
      }
    }
    return { ok: true }
  },
}

export const paymentProviders: Record<PaymentMethod, PaymentProvider> = {
  fastag: fastagProvider,
  upi: upiProvider,
  qr: qrProvider,
  card: cardProvider,
  debit: debitProvider,
  cash: cashProvider,
}
