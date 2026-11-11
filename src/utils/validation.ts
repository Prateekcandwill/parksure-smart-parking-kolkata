import { z } from 'zod'
import { isPlateLike, normalizePlate } from '@/utils/plates'

const phoneRegex = /^[6-9]\d{9}$/
const emailRegex = /^[^\s@]+@[^\s@]+(?:\.[^\s@]+)?$/
const upiRegex = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/

export function isEmail(value: string): boolean {
  return emailRegex.test(value)
}

export function isPhone(value: string): boolean {
  return phoneRegex.test(value.replace(/\D/g, '').slice(-10))
}

export const identifierSchema = z
  .string()
  .trim()
  .min(3, 'Enter your phone number or email')
  .refine((value) => isEmail(value) || isPhone(value), 'Enter a valid phone number or email')

export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter the 6-digit OTP')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')

export const registrationSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  phone: z
    .string()
    .trim()
    .refine((value) => isPhone(value), 'Enter a valid 10-digit mobile number'),
  plate: z
    .string()
    .trim()
    .refine((value) => isPlateLike(value), 'Enter a valid vehicle plate'),
  consent: z.boolean().refine(Boolean, 'Consent is required to create a driver account'),
})

export const plateSchema = z
  .string()
  .trim()
  .refine((value) => isPlateLike(value), 'Enter a valid vehicle plate')

export const avatarTones = ['gold', 'violet', 'green', 'blue'] as const
export type AvatarTone = (typeof avatarTones)[number]

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your full name')
    .max(60, 'Keep your name under 60 characters'),
  email: z
    .string()
    .trim()
    .min(3, 'Enter your email address')
    .max(120, 'Keep your email under 120 characters')
    .refine((value) => isEmail(value), 'Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .refine((value) => isPhone(value), 'Enter a valid 10-digit mobile number'),
  avatarTone: z.enum(avatarTones),
})

export type ProfileInput = z.infer<typeof profileSchema>

export const upiSchema = z
  .string()
  .trim()
  .regex(upiRegex, 'Use a valid UPI ID, for example name@bank')

export const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Add a short reason (at least 3 characters)')

export const staffSchema = z.object({
  name: z.string().trim().min(2, 'Enter the staff member’s name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z
    .string()
    .trim()
    .refine((value) => isPhone(value), 'Enter a valid 10-digit mobile number'),
  roles: z.array(z.enum(['driver', 'attendant', 'operator', 'admin'])).min(1, 'Select at least one role'),
})

export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let shouldDouble = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

export function detectCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '')
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'American Express'
  if (/^6(?:011|5)/.test(digits)) return 'Discover'
  if (/^(508|60|65|81|82|35)/.test(digits)) return 'RuPay'
  return 'Card'
}

export function validateExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const endOfMonth = new Date(year, month, 1)
  return endOfMonth.getTime() > Date.now()
}

export const cardSchema = z.object({
  number: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .refine((value) => luhnCheck(value), 'That card number does not pass the Luhn check'),
  expiry: z.string().refine(validateExpiry, 'Use a valid future expiry date (MM/YY)'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV must be 3 or 4 digits'),
  name: z.string().trim().min(2, 'Enter the name on the card'),
  save: z.boolean().optional(),
})

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10)
}

export function normalizeIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase()
  return isEmail(trimmed) ? trimmed : normalizePhone(trimmed)
}

export function normalizeVehiclePlate(value: string): string {
  return normalizePlate(value)
}
