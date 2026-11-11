import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  QrCode,
  Radio,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react'
import type { Payment, PaymentContext, PaymentMethod, PaymentResult } from '@/types'
import { useDB } from '@/api/useDB'
import { processPayment, paymentMethodNames } from '@/api/payments'
import { DEMO_OTP } from '@/api/auth'
import { DEMO_CONFIG } from '@/config/env'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Input'
import { OTPInput } from '@/components/ui/OTPInput'
import { SlideToPay } from '@/components/ui/SlideToPay'
import { Switch } from '@/components/ui/Switch'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, roundCurrency } from '@/utils/format'
import { cardSchema, detectCardBrand, upiSchema } from '@/utils/validation'
import { haptic } from '@/utils/haptics'
import { uid } from '@/utils/id'
import { cn } from '@/utils/cn'

type OnlineMethod = Exclude<PaymentMethod, 'cash'>
type Stage = 'form' | 'otp' | 'processing' | 'failed' | 'done'

const methodOptions: Array<{ id: OnlineMethod; label: string; icon: typeof Smartphone }> = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'card', label: 'Credit', icon: CreditCard },
  { id: 'debit', label: 'Debit', icon: Wallet },
  { id: 'fastag', label: 'FASTag', icon: Radio },
]

const upiApps = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM']

interface PaymentSheetProps {
  open: boolean
  onClose: () => void
  userId: string
  amount: number
  context: PaymentContext
  title?: string
  description?: string
  plate?: string
  placeName?: string
  receiptLabel?: string
  allowedMethods?: OnlineMethod[]
  lineItemLabel?: string
  onSuccess: (result: PaymentResult) => void | Promise<void>
  onFailure?: (error: unknown) => void
}

const emptyCard = { number: '', name: '', expiry: '', cvv: '' }

export function PaymentSheet({
  open,
  onClose,
  userId,
  amount,
  context,
  title = 'Pay securely',
  description = 'Simulated gateway. No real money moves in this demo.',
  plate,
  placeName,
  receiptLabel,
  allowedMethods,
  lineItemLabel,
  onSuccess,
  onFailure,
}: PaymentSheetProps) {
  const db = useDB()
  const [method, setMethod] = useState<OnlineMethod>('upi')
  const [savedMethodId, setSavedMethodId] = useState<string | null>(null)
  const [upiId, setUpiId] = useState('')
  const [upiApp, setUpiApp] = useState('Google Pay')
  const [card, setCard] = useState(emptyCard)
  const [saveMethod, setSaveMethod] = useState(true)
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState<Stage>('form')
  const [error, setError] = useState<string | null>(null)
  const [failure, setFailure] = useState<{ message: string; attempted: OnlineMethod } | null>(null)
  const [attempts, setAttempts] = useState<OnlineMethod[]>([])
  const [idemKey, setIdemKey] = useState(() => uid('idem'))
  const [lastResult, setLastResult] = useState<PaymentResult | null>(null)

  const savedMethods = db.paymentMethods.filter(
    (record) =>
      record.userId === userId &&
      (!allowedMethods || allowedMethods.includes(record.type as OnlineMethod)),
  )
  const availableMethods = methodOptions.filter(
    (option) => !allowedMethods || allowedMethods.includes(option.id),
  )
  const fastag = savedMethods.find(
    (record) => record.type === 'fastag' && (!plate || record.linkedPlate === plate),
  )
  const selectedSaved = savedMethods.find((record) => record.id === savedMethodId)
  const enabled = db.settings.paymentMethods

  useEffect(() => {
    if (!open) return
    const preferred =
      savedMethods.find((record) => record.isDefault) ?? savedMethods.find((record) => record.type === 'upi')
    const initial = (preferred?.type as OnlineMethod | undefined) ?? availableMethods[0]?.id ?? 'upi'
    setMethod(initial)
    setSavedMethodId(preferred?.id ?? null)
    setUpiId(preferred?.upiId ?? '')
    setUpiApp('Google Pay')
    setCard(emptyCard)
    setSaveMethod(true)
    setOtp('')
    setStage('form')
    setError(null)
    setFailure(null)
    setAttempts([])
    setIdemKey(uid('idem'))
    setLastResult(null)
    // Resetting only when the sheet opens is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const totals = useMemo(() => {
    const base = roundCurrency(amount / 1.18)
    const cgst = roundCurrency(base * 0.09)
    const sgst = roundCurrency(amount - base - cgst)
    return { base, cgst, sgst }
  }, [amount])

  const fallbackLadder = availableMethods.filter(
    (option) =>
      option.id !== method && enabled[option.id] && !attempts.includes(option.id),
  )

  const disabledReason = (() => {
    if (!enabled[method]) {
      return `${paymentMethodNames[method]} is switched off by the administrator.`
    }
    if (method === 'fastag') {
      if (!fastag) return 'No FASTag is linked to this vehicle. Choose another method.'
      if ((fastag.balance ?? 0) < amount) {
        return `FASTag balance is ${formatCurrency(fastag.balance ?? 0)}. Top up or choose another method.`
      }
    }
    return undefined
  })()

  const selectMethod = (next: OnlineMethod) => {
    haptic('tap')
    setMethod(next)
    setSavedMethodId(null)
    setStage('form')
    setError(null)
    setFailure(null)
  }

  const selectSaved = (recordId: string) => {
    const record = savedMethods.find((candidate) => candidate.id === recordId)
    if (!record) return
    haptic('tap')
    setSavedMethodId(record.id)
    setMethod(record.type as OnlineMethod)
    if (record.upiId) setUpiId(record.upiId)
    setStage('form')
    setError(null)
    setFailure(null)
  }

  const validate = (): string | null => {
    if (!enabled[method]) return `${paymentMethodNames[method]} is switched off by the administrator.`
    if (method === 'upi') {
      const parsed = upiSchema.safeParse(upiId)
      if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Enter a valid UPI ID.'
    }
    if ((method === 'card' || method === 'debit') && !selectedSaved) {
      const parsed = cardSchema.safeParse({
        number: card.number,
        expiry: card.expiry,
        cvv: card.cvv,
        name: card.name,
        save: saveMethod,
      })
      if (!parsed.success) return parsed.error.issues[0]?.message ?? 'Check your card details.'
    }
    if (method === 'fastag') {
      if (!fastag) return 'No FASTag is linked to this vehicle. Choose another method.'
      if ((fastag.balance ?? 0) < amount) return 'The FASTag balance does not cover this payment.'
    }
    return null
  }

  const buildMeta = (): NonNullable<Payment['meta']> => {
    if (method === 'upi') {
      return { upiId: upiId.trim(), upiApp, saveMethod }
    }
    if (method === 'qr') {
      return { upiApp: 'UPI QR', saveMethod: false }
    }
    if (method === 'fastag') {
      return { tagId: fastag?.tagId }
    }
    if (selectedSaved) {
      return {
        brand: selectedSaved.brand,
        last4: selectedSaved.last4,
        expiry: selectedSaved.detail.replace('Expires ', ''),
        saveMethod: false,
      }
    }
    const digits = card.number.replace(/\D/g, '')
    return {
      brand: detectCardBrand(digits),
      last4: digits.slice(-4),
      expiry: card.expiry,
      saveMethod,
    }
  }

  const submit = async () => {
    setStage('processing')
    setError(null)
    setAttempts((current) => (current.includes(method) ? current : [...current, method]))
    try {
      const result = await processPayment({
        userId,
        amount,
        method,
        context,
        idempotencyKey: idemKey,
        receiptLabel,
        placeName,
        plate,
        meta: buildMeta(),
      })
      haptic('success')
      setLastResult(result)
      setStage('done')
      await onSuccess(result)
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'The simulated gateway did not complete this payment.'
      haptic('error')
      setFailure({ message, attempted: method })
      setError(message)
      setStage('failed')
      setIdemKey(uid('idem'))
      onFailure?.(caught)
    }
  }

  const handleSlide = () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      haptic('error')
      return
    }
    setError(null)
    if (method === 'card' || method === 'debit') {
      setOtp('')
      setStage('otp')
      haptic('tap')
      return
    }
    void submit()
  }

  const verifyOtp = (value: string) => {
    if (value !== DEMO_OTP) {
      setOtp('')
      setError(`That 3-D Secure code is not correct. Use ${DEMO_CONFIG.secureCode} in demo mode.`)
      haptic('error')
      return
    }
    setError(null)
    void submit()
  }

  const retry = () => {
    setStage('form')
    setFailure(null)
    setError(null)
    setOtp('')
  }

  const footer = (() => {
    if (stage === 'done') {
      return (
        <Button size="lg" className="w-full" onClick={onClose}>
          Done
        </Button>
      )
    }
    if (stage === 'failed') {
      return (
        <div className="space-y-2">
          <Button size="lg" className="w-full" iconLeft={<RotateCcw className="h-4 w-4" />} onClick={retry}>
            Try {paymentMethodNames[failure?.attempted ?? method]} again
          </Button>
          <Button variant="ghost" size="md" className="w-full" onClick={onClose}>
            Cancel payment
          </Button>
        </div>
      )
    }
    if (stage === 'otp') {
      return (
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full"
            disabled={otp.length !== 6}
            iconLeft={<LockKeyhole className="h-4 w-4" />}
            onClick={() => verifyOtp(otp)}
          >
            Verify and pay {formatCurrency(amount)}
          </Button>
          <p className="text-center text-[11px] text-muted">
            Demo 3-D Secure code <span className="font-mono text-text">{DEMO_CONFIG.secureCode}</span>
          </p>
        </div>
      )
    }
    if (stage === 'processing') {
      return (
        <div className="flex min-h-16 items-center justify-center gap-2 rounded-[22px] border border-line/90 bg-ink/55 text-sm font-semibold text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
          Contacting the simulated gateway…
        </div>
      )
    }
    return (
      <div className="space-y-2">
        <SlideToPay
          label={`Pay ${formatCurrency(amount)}`}
          onConfirm={handleSlide}
          disabled={Boolean(disabledReason)}
          disabledReason={disabledReason}
        />
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
          Demo payment · 18% GST invoice generated on success
        </p>
      </div>
    )
  })()

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={footer}
    >
      <div className="space-y-4 pb-2">
        <div className="rounded-[22px] border border-line/85 bg-ink/40 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="label-caps">Amount due</div>
              <div className="mt-1 font-mono text-3xl font-semibold tracking-tight text-text">
                {formatCurrency(amount)}
              </div>
            </div>
            {plate ? (
              <div className="text-right">
                <div className="label-caps">Vehicle</div>
                <div className="mt-1 font-mono text-sm font-semibold text-text">{plate}</div>
              </div>
            ) : null}
          </div>
          <div className="mt-3 space-y-1 border-t border-line/70 pt-3 text-[11px] text-muted">
            <div className="flex justify-between">
              <span>{lineItemLabel ?? 'Parking subtotal'}</span>
              <span className="font-mono text-text/85">{formatCurrency(totals.base)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST 9% · SGST 9%</span>
              <span className="font-mono text-text/85">
                {formatCurrency(totals.cgst)} + {formatCurrency(totals.sgst)}
              </span>
            </div>
          </div>
        </div>

        {stage === 'done' && lastResult ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
              <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-text">Payment captured</h3>
              <p className="mt-1 text-sm text-muted">
                {paymentMethodNames[lastResult.payment.method]} · {formatCurrency(lastResult.payment.amount)}
              </p>
            </div>
            <div className="mx-auto max-w-xs rounded-2xl border border-line/85 bg-raised/60 p-3 text-left">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Receipt</span>
                <span className="font-mono text-text">{lastResult.receipt.number}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                <span>Reference</span>
                <span className="font-mono text-text">{lastResult.payment.reference}</span>
              </div>
            </div>
          </div>
        ) : stage === 'failed' && failure ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
                <AlertTriangle className="h-8 w-8" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-text">
                {paymentMethodNames[failure.attempted]} did not go through
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{failure.message}</p>
            </div>
            <div className="rounded-2xl border border-line/85 bg-raised/40 p-3">
              <div className="label-caps">Fallback ladder</div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                Try another enabled method. A failed attempt is recorded but never marks a bay or barrier as paid.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {fallbackLadder.length > 0 ? (
                  fallbackLadder.map((option) => {
                    const Icon = option.icon
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => selectMethod(option.id)}
                        className="focus-ring flex min-h-12 items-center gap-2 rounded-xl border border-line/85 bg-surface px-3 text-left text-xs font-semibold text-text transition-colors hover:border-accent/35"
                      >
                        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                        {paymentMethodNames[option.id]}
                      </button>
                    )
                  })
                ) : (
                  <p className="col-span-2 text-xs text-muted">
                    No unused fallback method is enabled. Retry the same method or ask an attendant.
                  </p>
                )}
              </div>
            </div>
            {error ? (
              <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : stage === 'otp' ? (
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-2xl border border-accent/20 bg-accent/8 p-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold text-text">3-D Secure verification</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Your bank sent a one-time code for the simulated {paymentMethodNames[method].toLowerCase()}. Enter
                  it to finish the payment.
                </p>
              </div>
            </div>
            <OTPInput
              value={otp}
              onChange={setOtp}
              onComplete={verifyOtp}
              label="3-D Secure one-time code"
              error={error ?? undefined}
              autoFocus
            />
            <div className="flex items-center justify-between rounded-xl border border-line/80 bg-raised/40 px-3 py-2 text-[11px] text-muted">
              <span>Slide was confirmed</span>
              <StatusBadge tone="info" label="Awaiting bank code" />
            </div>
          </div>
        ) : stage === 'processing' ? (
          <div className="space-y-3 py-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" aria-hidden="true" />
            <p className="text-sm font-semibold text-text">Authorising payment</p>
            <p className="text-xs text-muted">The demo gateway is checking the method and amount.</p>
          </div>
        ) : (
          <>
            <div>
              <div className="label-caps mb-2">Payment method</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {availableMethods.map((option) => {
                  const Icon = option.icon
                  const active = method === option.id
                  const off = !enabled[option.id]
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={off}
                      aria-pressed={active}
                      onClick={() => selectMethod(option.id)}
                      className={cn(
                        'focus-ring flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 text-[11px] font-semibold transition-colors',
                        active
                          ? 'border-accent/45 bg-accent/12 text-accent'
                          : 'border-line/85 bg-raised/50 text-muted hover:border-muted/40 hover:text-text',
                        off && 'cursor-not-allowed opacity-35',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {savedMethods.length > 0 ? (
              <div>
                <div className="label-caps mb-2">Saved methods</div>
                <div className="flex flex-wrap gap-2 pb-1">
                  {savedMethods.map((record) => {
                    const active = savedMethodId === record.id
                    return (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => selectSaved(record.id)}
                        aria-pressed={active}
                        className={cn(
                          'focus-ring min-h-12 shrink-0 rounded-xl border px-3 text-left text-[11px] font-semibold transition-colors',
                          active
                            ? 'border-accent/40 bg-accent/12 text-accent'
                            : 'border-line/85 bg-raised/40 text-muted hover:text-text',
                        )}
                      >
                        <span className="block">{record.label}</span>
                        <span className="mt-0.5 block text-[10px] font-normal opacity-80">{record.detail}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {method === 'upi' ? (
              <div className="space-y-3">
                <TextField
                  label="UPI ID"
                  placeholder="name@bank"
                  value={upiId}
                  onChange={(event) => {
                    setUpiId(event.target.value)
                    setSavedMethodId(null)
                  }}
                  icon={<Smartphone className="h-4 w-4" />}
                  hint="Try aritra@okhdfc, or any name@bank format."
                  autoComplete="off"
                />
                <div>
                  <div className="label-caps mb-2">UPI app</div>
                  <div className="flex flex-wrap gap-2">
                    {upiApps.map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setUpiApp(app)}
                        aria-pressed={upiApp === app}
                        className={cn(
                          'focus-ring min-h-10 rounded-full border px-3 text-[11px] font-semibold transition-colors',
                          upiApp === app
                            ? 'border-accent/35 bg-accent/10 text-accent'
                            : 'border-line/80 text-muted hover:text-text',
                        )}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
                <Switch
                  checked={saveMethod}
                  onChange={setSaveMethod}
                  label="Save this UPI ID"
                  description="Saved methods stay in this browser only."
                />
              </div>
            ) : null}

            {method === 'qr' ? (
              <div className="space-y-3">
                <div className="mx-auto w-fit rounded-[24px] border border-line/90 bg-white p-3 shadow-lift">
                  <QRCodeSVG
                    value={`upi://pay?pa=parksure@demo&pn=ParkSure&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(receiptLabel ?? 'Parking payment')}`}
                    size={188}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#0B0B0F"
                    aria-label="UPI payment QR code"
                  />
                </div>
                <p className="text-center text-xs leading-relaxed text-muted">
                  Scan with any UPI app. The demo verifies the QR when you slide below.
                </p>
                <div className="rounded-xl border border-line/80 bg-raised/40 px-3 py-2 text-center text-[11px] text-muted">
                  QR reference <span className="font-mono text-text">PS-QR-{amount.toFixed(0)}</span> · refreshes
                  every 5 minutes
                </div>
              </div>
            ) : null}

            {method === 'card' || method === 'debit' ? (
              selectedSaved ? (
                <div className="rounded-2xl border border-accent/25 bg-accent/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{selectedSaved.label}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{selectedSaved.detail}</div>
                    </div>
                    <StatusBadge tone="success" label="Saved" />
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    This demo card passes the Luhn check and will request a 3-D Secure code after the slide.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <TextField
                    label="Card number"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={card.number}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, '').slice(0, 19)
                      setCard((current) => ({
                        ...current,
                        number: digits.replace(/(.{4})/g, '$1 ').trim(),
                      }))
                      setSavedMethodId(null)
                    }}
                    icon={<CreditCard className="h-4 w-4" />}
                    hint="Use 4242 4242 4242 4242 to pass the Luhn check."
                    autoComplete="cc-number"
                  />
                  <TextField
                    label="Name on card"
                    placeholder="AARAV MEHTA"
                    value={card.name}
                    onChange={(event) => setCard((current) => ({ ...current, name: event.target.value }))}
                    autoComplete="cc-name"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      label="Expiry"
                      inputMode="numeric"
                      placeholder="MM/YY"
                      value={card.expiry}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '').slice(0, 4)
                        setCard((current) => ({
                          ...current,
                          expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits,
                        }))
                      }}
                      autoComplete="cc-exp"
                    />
                    <TextField
                      label="CVV"
                      type="password"
                      inputMode="numeric"
                      placeholder="•••"
                      maxLength={4}
                      value={card.cvv}
                      onChange={(event) =>
                        setCard((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '').slice(0, 4) }))
                      }
                      autoComplete="cc-csc"
                    />
                  </div>
                  <Switch
                    checked={saveMethod}
                    onChange={setSaveMethod}
                    label="Save this card"
                    description="Only the brand and last four digits are stored in demo mode."
                  />
                </div>
              )
            ) : null}

            {method === 'fastag' ? (
              <div className="rounded-2xl border border-line/85 bg-raised/40 p-4">
                {fastag ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-text">{fastag.label}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{fastag.detail}</div>
                      </div>
                      <StatusBadge
                        tone={(fastag.balance ?? 0) >= amount ? 'success' : 'danger'}
                        label={`${formatCurrency(fastag.balance ?? 0)} balance`}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-line/70 bg-ink/40 px-3 py-2 text-[11px] text-muted">
                      <span>After this payment</span>
                      <span className="font-mono text-text">
                        {formatCurrency(Math.max(0, (fastag.balance ?? 0) - amount))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-semibold text-text">No FASTag linked</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        Link a FASTag to this plate from Wallet, or choose UPI, QR or card.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {error ? (
              <p
                className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs leading-relaxed text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </BottomSheet>
  )
}
