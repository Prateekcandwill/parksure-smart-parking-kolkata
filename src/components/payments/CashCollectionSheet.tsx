import { useEffect, useState } from 'react'
import { Banknote, CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import type { GateEvent, PaymentResult, User } from '@/types'
import { collectCash } from '@/api/gate'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Input'
import { SlideToPay } from '@/components/ui/SlideToPay'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, roundCurrency } from '@/utils/format'
import { haptic } from '@/utils/haptics'

type CashResult = PaymentResult & { change: number }

interface CashCollectionSheetProps {
  open: boolean
  event: GateEvent | null
  attendant: User
  onClose: () => void
  onSuccess: (result: CashResult) => void
}

const quickAmounts = [100, 200, 500, 2000]

export function CashCollectionSheet({ open, event, attendant, onClose, onSuccess }: CashCollectionSheetProps) {
  const due = event?.paymentDue ?? 0
  const [received, setReceived] = useState(String(due))
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<'form' | 'processing' | 'done' | 'failed'>('form')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CashResult | null>(null)

  useEffect(() => {
    if (!open) return
    setReceived(String(due))
    setNote('')
    setStage('form')
    setError(null)
    setResult(null)
  }, [due, open])

  const numeric = Number(received)
  const change = Number.isFinite(numeric) ? roundCurrency(Math.max(0, numeric - due)) : 0
  const short = !Number.isFinite(numeric) || numeric < due

  const submit = async () => {
    if (!event) return
    if (short) {
      setError('The amount received is less than the amount due.')
      haptic('error')
      return
    }
    setStage('processing')
    setError(null)
    try {
      const next = await collectCash({
        eventId: event.id,
        attendant,
        amountReceived: numeric,
        note: note.trim() || undefined,
      })
      haptic('success')
      setResult(next)
      setStage('done')
      onSuccess(next)
    } catch (caught) {
      haptic('error')
      setError(caught instanceof Error ? caught.message : 'Cash could not be recorded.')
      setStage('failed')
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Collect cash"
      description="Attendant-only method. Online payments remain available to the driver."
      size="md"
      footer={
        stage === 'done' ? (
          <Button size="lg" className="w-full" onClick={onClose}>
            Done
          </Button>
        ) : stage === 'processing' ? (
          <div className="flex min-h-16 items-center justify-center gap-2 rounded-[22px] border border-line/90 bg-ink/55 text-sm font-semibold text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
            Recording cash…
          </div>
        ) : (
          <SlideToPay
            label={`Collect ${formatCurrency(due)}`}
            onConfirm={submit}
            disabled={short || !event}
            disabledReason={short ? 'Enter at least the amount due to open the barrier.' : undefined}
          />
        )
      }
    >
      {event ? (
        <div className="space-y-4 pb-2">
          <div className="rounded-[22px] border border-line/85 bg-ink/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-caps">Cash due</div>
                <div className="mt-1 font-mono text-3xl font-semibold text-text">{formatCurrency(due)}</div>
              </div>
              <StatusBadge tone={event.prebooked ? 'danger' : 'warning'} label={event.prebooked ? 'Pre-booked' : 'Cash allowed'} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-3 text-[11px] text-muted">
              <span className="font-mono text-text">{event.plateRead}</span>
              <span>{event.direction === 'exit' ? 'Exit barrier' : 'Entry barrier'}</span>
            </div>
          </div>

          {event.prebooked ? (
            <div className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/8 p-3 text-xs leading-relaxed text-danger">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Cash is not accepted for pre-booked slots. Ask the driver to pay with UPI, QR, card, debit or FASTag.
            </div>
          ) : stage === 'done' && result ? (
            <div className="space-y-3 py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
                <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-text">Barrier opened</h3>
                <p className="mt-1 text-sm text-muted">
                  Cash {formatCurrency(result.payment.amount)} recorded · receipt {result.receipt.number}
                </p>
              </div>
              <div className="mx-auto max-w-xs rounded-2xl border border-accent/25 bg-accent/8 p-3">
                <div className="text-[11px] text-muted">Return change</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-accent">{formatCurrency(result.change)}</div>
              </div>
            </div>
          ) : (
            <>
              <TextField
                label="Amount received"
                inputMode="decimal"
                value={received}
                onChange={(event) => {
                  setReceived(event.target.value.replace(/[^\d.]/g, ''))
                  setError(null)
                }}
                icon={<Banknote className="h-4 w-4" />}
                hint={`Change to return: ${formatCurrency(change)}`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReceived(String(due))}
                  className="focus-ring min-h-10 rounded-full border border-accent/30 bg-accent/10 px-3 text-[11px] font-semibold text-accent"
                >
                  Exact {formatCurrency(due)}
                </button>
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setReceived(String(amount))}
                    className="focus-ring min-h-10 rounded-full border border-line/80 px-3 text-[11px] font-semibold text-muted hover:text-text"
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>
              <TextField
                label="Note (optional)"
                placeholder="Cash handed over at exit"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="rounded-2xl border border-line/80 bg-raised/40 p-3 text-[11px] leading-relaxed text-muted">
                Cash goes into the open shift for this place. The operator reconciles counted cash later.
              </div>
              {error ? (
                <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </BottomSheet>
  )
}
