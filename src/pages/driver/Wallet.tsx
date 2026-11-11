import { useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  Plus,
  Radio,
  ReceiptText,
  RefreshCw,
  Smartphone,
  Star,
  Trash2,
  Wallet as WalletIcon,
} from 'lucide-react'
import type { Payment, PaymentMethodRecord, Receipt } from '@/types'
import { useDB } from '@/api/useDB'
import {
  addPaymentMethod,
  getReceiptForPayment,
  getUserPayments,
  paymentMethodNames,
  removePaymentMethod,
  setDefaultPaymentMethod,
  updateFastagBalance,
} from '@/api/payments'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { PaymentSheet } from '@/components/payments/PaymentSheet'
import { ReceiptSheet } from '@/components/payments/ReceiptSheet'
import { StatTile } from '@/components/common/StatTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip, ChipRow } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatCurrency, formatDateTime, titleCase } from '@/utils/format'
import { upiSchema } from '@/utils/validation'
import { toast } from '@/store/toast'
import { haptic } from '@/utils/haptics'

type HistoryFilter = 'all' | 'success' | 'refunded' | 'failed'

const topUpAmounts = [100, 200, 500, 1000]

const methodIcon: Record<PaymentMethodRecord['type'], typeof Smartphone> = {
  upi: Smartphone,
  card: CreditCard,
  debit: WalletIcon,
  fastag: Radio,
}

export default function WalletPage() {
  const db = useDB()
  const user = useCurrentUser()
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [upiId, setUpiId] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyMethod, setBusyMethod] = useState<string | null>(null)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(200)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const methods = useMemo(
    () => db.paymentMethods.filter((method) => method.userId === user?.id),
    [db.paymentMethods, user?.id],
  )
  const payments = useMemo(() => (user ? getUserPayments(user.id) : []), [db.payments, user])
  const fastag = methods.find((method) => method.type === 'fastag')

  const spent = payments
    .filter((payment) => payment.kind === 'payment' && payment.status === 'success' && payment.context !== 'topup')
    .reduce((sum, payment) => sum + payment.amount, 0)
  const refunded = payments
    .filter((payment) => payment.kind === 'refund')
    .reduce((sum, payment) => sum + payment.amount, 0)

  const filtered = payments.filter((payment) => {
    if (filter === 'all') return true
    if (filter === 'refunded') return payment.kind === 'refund' || payment.status === 'refunded'
    return payment.status === filter
  })

  if (!user) return null

  const openReceipt = (payment: Payment) => {
    const found = getReceiptForPayment(payment.id)
    if (!found) {
      toast({ tone: 'info', title: 'No receipt for this entry', message: 'Failed or refund rows have no GST invoice.' })
      return
    }
    haptic('tap')
    setReceipt(found)
    setReceiptOpen(true)
  }

  const saveUpi = async () => {
    const parsed = upiSchema.safeParse(upiId)
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Enter a valid UPI ID.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await addPaymentMethod({
        userId: user.id,
        type: 'upi',
        label: 'UPI',
        detail: parsed.data,
        upiId: parsed.data,
      })
      haptic('success')
      toast({ tone: 'success', title: 'UPI ID saved', message: 'Available at every checkout in this browser.' })
      setAddOpen(false)
      setUpiId('')
    } catch {
      setFormError('Could not save this method. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const makeDefault = async (method: PaymentMethodRecord) => {
    setBusyMethod(method.id)
    try {
      await setDefaultPaymentMethod(user.id, method.id)
      haptic('success')
      toast({ tone: 'success', title: 'Default updated', message: method.label })
    } finally {
      setBusyMethod(null)
    }
  }

  const removeMethod = async (method: PaymentMethodRecord) => {
    setBusyMethod(method.id)
    try {
      await removePaymentMethod(method.id)
      haptic('warning')
      toast({ tone: 'info', title: 'Method removed', message: method.label })
    } finally {
      setBusyMethod(null)
    }
  }

  const openTopUp = () => {
    if (!fastag) {
      toast({ tone: 'info', title: 'No FASTag linked', message: 'Link a FASTag from a vehicle to top up.' })
      return
    }
    haptic('tap')
    setTopUpOpen(true)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Wallet"
        title="Payments & passes"
        description="Saved methods, FASTag balance and every simulated receipt in one place."
        action={<DemoBadge />}
      />

      <Card strong className="overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label-caps">Total parking spend</div>
            <div className="mt-1 font-mono text-3xl font-semibold tracking-tight text-text">
              {formatCurrency(spent)}
            </div>
            <p className="mt-1 text-[11px] text-muted">Includes GST · excludes wallet top-ups</p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
            <WalletIcon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatTile label="Refunded" value={formatCurrency(refunded)} tone="success" />
          <StatTile label="Payments" value={String(payments.length)} tone="info" />
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">FASTag</h3>
          </div>
          <StatusBadge tone={fastag ? 'success' : 'unknown'} label={fastag ? 'Linked' : 'Not linked'} />
        </div>
        {fastag ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="font-mono text-2xl font-semibold text-text">
                  {formatCurrency(fastag.balance ?? 0)}
                </div>
                <div className="mt-1 text-[11px] text-muted">{fastag.detail}</div>
              </div>
              <Button size="sm" variant="secondary" iconLeft={<Plus className="h-4 w-4" />} onClick={openTopUp}>
                Top up
              </Button>
            </div>
            <div className="mt-4">
              <div className="label-caps mb-2">Quick top-up amount</div>
              <ChipRow>
                {topUpAmounts.map((amount) => (
                  <Chip
                    key={amount}
                    active={topUpAmount === amount}
                    onClick={() => {
                      haptic('tap')
                      setTopUpAmount(amount)
                    }}
                  >
                    {formatCurrency(amount)}
                  </Chip>
                ))}
              </ChipRow>
            </div>
            <Button
              className="mt-3 w-full"
              iconLeft={<RefreshCw className="h-4 w-4" />}
              onClick={() => {
                setTopUpOpen(true)
                haptic('tap')
              }}
            >
              Add {formatCurrency(topUpAmount)} to FASTag
            </Button>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Add a FASTag to a vehicle to use tap-and-go payments. UPI, QR and cards still work everywhere.
          </p>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-text">Saved methods</h3>
          </div>
          <Button size="sm" variant="ghost" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setAddOpen(true)}>
            Add
          </Button>
        </div>
        {methods.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            Nothing saved yet. Cards and UPI IDs are stored in this browser only.
          </p>
        ) : (
          <div className="space-y-2">
            {methods.map((method) => {
              const Icon = methodIcon[method.type]
              return (
                <div
                  key={method.id}
                  className="flex items-center gap-3 rounded-2xl border border-line/80 bg-raised/40 p-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/80 bg-ink/40 text-accent">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-text">{method.label}</span>
                      {method.isDefault ? <StatusBadge tone="success" label="Default" /> : null}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted">{method.detail}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Make ${method.label} the default method`}
                      onClick={() => void makeDefault(method)}
                      disabled={busyMethod === method.id || method.isDefault}
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-accent disabled:opacity-35"
                    >
                      <Star className={method.isDefault ? 'h-4 w-4 fill-current text-accent' : 'h-4 w-4'} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${method.label}`}
                      onClick={() => void removeMethod(method)}
                      disabled={busyMethod === method.id}
                      className="focus-ring flex h-11 w-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-35"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-text">Payment history</h3>
        </div>
        <SegmentedControl
          ariaLabel="Filter payment history"
          value={filter}
          onChange={(value) => {
            haptic('tap')
            setFilter(value)
          }}
          options={[
            { value: 'all', label: 'All' },
            { value: 'success', label: 'Paid' },
            { value: 'refunded', label: 'Refunds' },
            { value: 'failed', label: 'Failed' },
          ]}
          className="mb-3"
        />
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="h-6 w-6" aria-hidden="true" />}
            title="No payments here"
            body="Book a bay or top up your FASTag and the receipt will appear in this list."
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((payment) => {
              const isRefund = payment.kind === 'refund' || payment.status === 'refunded'
              return (
                <li key={payment.id}>
                  <button
                    type="button"
                    onClick={() => openReceipt(payment)}
                    className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-line/80 bg-raised/30 p-3 text-left transition-colors hover:border-accent/30"
                  >
                    <span
                      className={
                        isRefund
                          ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-success/25 bg-success/10 text-success'
                          : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line/80 bg-ink/40 text-muted'
                      }
                    >
                      {isRefund ? (
                        <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-text">
                          {isRefund ? 'Refund' : titleCase(payment.context)} · {paymentMethodNames[payment.method]}
                        </span>
                        <span
                          className={
                            isRefund
                              ? 'shrink-0 font-mono text-sm font-semibold text-success'
                              : 'shrink-0 font-mono text-sm font-semibold text-text'
                          }
                        >
                          {isRefund ? '+' : ''}
                          {formatCurrency(payment.amount)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                        <span>{formatDateTime(payment.createdAt)}</span>
                        <span className="font-mono">{payment.reference}</span>
                        {payment.status === 'failed' ? <StatusBadge tone="danger" label="Failed" /> : null}
                        {payment.status === 'refunded' ? <StatusBadge tone="success" label="Refunded" /> : null}
                        {payment.status === 'success' && !isRefund ? (
                          <StatusBadge tone="success" label="Paid" />
                        ) : null}
                        {payment.status === 'success' && isRefund ? (
                          <StatusBadge tone="success" label="Credited" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <BottomSheet
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setFormError(null)
        }}
        title="Add a UPI ID"
        description="Saved methods stay in this browser and are never sent to a real bank."
        footer={
          <Button className="w-full" size="lg" loading={saving} onClick={() => void saveUpi()}>
            Save UPI ID
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <TextField
            label="UPI ID"
            placeholder="name@bank"
            value={upiId}
            onChange={(event) => {
              setUpiId(event.target.value)
              setFormError(null)
            }}
            icon={<Smartphone className="h-4 w-4" />}
            hint="Example: aritra@okhdfc"
            error={formError ?? undefined}
            autoComplete="off"
          />
          <div className="flex items-start gap-2 rounded-xl border border-line/80 bg-raised/40 p-3 text-[11px] leading-relaxed text-muted">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            Demo validation only checks the name@bank format. No collect request is sent.
          </div>
        </div>
      </BottomSheet>

      <PaymentSheet
        open={topUpOpen}
        onClose={() => setTopUpOpen(false)}
        userId={user.id}
        amount={topUpAmount}
        context="topup"
        title="Top up FASTag"
        description={`Add ${formatCurrency(topUpAmount)} to ${fastag?.detail ?? 'your FASTag'} using a simulated method.`}
        plate={fastag?.linkedPlate}
        receiptLabel="FASTag wallet top-up"
        lineItemLabel="FASTag top-up"
        allowedMethods={['upi', 'qr', 'card', 'debit']}
        onSuccess={async () => {
          if (!fastag?.linkedPlate) return
          await updateFastagBalance(user.id, fastag.linkedPlate, (fastag.balance ?? 0) + topUpAmount)
          setTopUpOpen(false)
          haptic('success')
          toast({
            tone: 'success',
            title: 'FASTag topped up',
            message: `${formatCurrency(topUpAmount)} added · new balance ${formatCurrency((fastag.balance ?? 0) + topUpAmount)}`,
          })
        }}
      />

      <ReceiptSheet receipt={receipt} open={receiptOpen} onClose={() => setReceiptOpen(false)} />
    </div>
  )
}
