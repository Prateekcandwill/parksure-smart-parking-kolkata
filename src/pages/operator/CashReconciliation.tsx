import { useMemo, useState } from 'react'
import { Banknote, CheckCircle2, CircleDollarSign, Clock3, Scale } from 'lucide-react'
import type { CashShift } from '@/types'
import { useDB } from '@/api/useDB'
import { getShiftsForPlace, reconcileShift } from '@/api/gate'
import { useActivePlace } from '@/hooks/useActivePlace'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceSwitcher } from '@/components/layout/PlaceSwitcher'
import { StatTile } from '@/components/common/StatTile'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DemoBadge } from '@/components/ui/DemoBadge'
import { formatCurrency, formatDateTime, roundCurrency } from '@/utils/format'
import { haptic } from '@/utils/haptics'
import { toast } from '@/store/toast'

export default function CashReconciliationPage() {
  const db = useDB()
  const user = useCurrentUser()
  const place = useActivePlace()
  const [target, setTarget] = useState<CashShift | null>(null)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const shifts = useMemo(
    () => (place ? getShiftsForPlace(place.id) : []),
    [db.shifts, place],
  )
  const openShifts = shifts.filter((shift) => shift.status !== 'reconciled')
  const totalCash = shifts.reduce((sum, shift) => sum + shift.cashCollected, 0)
  const varianceTotal = shifts
    .filter((shift) => shift.status === 'reconciled')
    .reduce((sum, shift) => sum + (shift.variance ?? 0), 0)

  if (!user || !place) return null

  const openReconcile = (shift: CashShift) => {
    haptic('tap')
    setTarget(shift)
    setCounted(String(shift.cashCollected))
    setReason('')
  }

  const numeric = Number(counted)
  const variance = target && Number.isFinite(numeric) ? roundCurrency(numeric - target.cashCollected) : 0
  const needsReason = Math.abs(variance) > 0.009

  const submit = async () => {
    if (!target) return
    if (!Number.isFinite(numeric) || numeric < 0) {
      toast({ tone: 'warning', title: 'Enter a counted amount', message: 'Use zero or more.' })
      return
    }
    if (needsReason && reason.trim().length < 3) {
      toast({ tone: 'warning', title: 'Explain the variance', message: 'Add at least 3 characters.' })
      return
    }
    setSubmitting(true)
    try {
      await reconcileShift({
        shiftId: target.id,
        operator: user,
        countedAmount: numeric,
        reason: reason.trim(),
      })
      haptic('success')
      toast({
        tone: 'success',
        title: 'Shift reconciled',
        message: needsReason ? `Variance ${formatCurrency(variance)}` : 'No variance',
      })
      setTarget(null)
    } catch (caught) {
      toast({
        tone: 'error',
        title: 'Could not reconcile',
        message: caught instanceof Error ? caught.message : 'Try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Cash"
        title="Reconciliation"
        description="Match counted cash to the attendant shift ledger."
        action={<PlaceSwitcher />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <DemoBadge />
        <StatusBadge tone={openShifts.length > 0 ? 'warning' : 'success'} label={`${openShifts.length} awaiting`} />
      </div>

      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
        <StatTile
          label="Cash recorded"
          value={formatCurrency(totalCash)}
          tone="accent"
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatTile
          label="Awaiting"
          value={String(openShifts.length)}
          tone="warning"
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatTile
          label="Reconciled variance"
          value={formatCurrency(varianceTotal)}
          tone={Math.abs(varianceTotal) > 0.009 ? 'danger' : 'success'}
          icon={<Scale className="h-4 w-4" />}
        />
      </div>

      {shifts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CircleDollarSign className="h-6 w-6" aria-hidden="true" />}
            title="No cash shifts yet"
            body="A shift starts automatically when an attendant collects the first cash payment at this place."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {shifts.map((shift) => {
            const attendant = db.users.find((candidate) => candidate.id === shift.attendantId)
            return (
              <li key={shift.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-text">{attendant?.name ?? 'Attendant'}</span>
                        <StatusBadge
                          tone={
                            shift.status === 'reconciled'
                              ? 'success'
                              : shift.status === 'closed'
                                ? 'info'
                                : 'warning'
                          }
                          label={shift.status}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-muted">
                        Started {formatDateTime(shift.startedAt)}
                        {shift.reconciledAt ? ` · reconciled ${formatDateTime(shift.reconciledAt)}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="label-caps">Cash</div>
                      <div className="mt-1 font-mono text-lg font-semibold text-text">
                        {formatCurrency(shift.cashCollected)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line/70 pt-3 text-[11px] min-[420px]:grid-cols-3">
                    <div>
                      <div className="text-muted">Opening float</div>
                      <div className="mt-0.5 font-mono font-semibold text-text">
                        {formatCurrency(shift.openingFloat)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted">Transactions</div>
                      <div className="mt-0.5 font-mono font-semibold text-text">{shift.transactions}</div>
                    </div>
                    <div>
                      <div className="text-muted">{shift.status === 'reconciled' ? 'Variance' : 'Expected'}</div>
                      <div className="mt-0.5 font-mono font-semibold text-text">
                        {shift.status === 'reconciled'
                          ? formatCurrency(shift.variance ?? 0)
                          : formatCurrency(shift.cashCollected)}
                      </div>
                    </div>
                  </div>

                  {shift.status === 'reconciled' ? (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-success/25 bg-success/8 p-3 text-[11px] leading-relaxed text-success">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        Counted {formatCurrency(shift.countedAmount ?? 0)}
                        {shift.reason ? ` · ${shift.reason}` : ''}
                      </span>
                    </div>
                  ) : (
                    <Button className="mt-3 w-full" variant="secondary" onClick={() => openReconcile(shift)}>
                      Reconcile counted cash
                    </Button>
                  )}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <BottomSheet
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title="Reconcile shift"
        description="Enter the physical cash counted for this shift."
        footer={
          <Button size="lg" className="w-full" loading={submitting} onClick={() => void submit()}>
            Confirm reconciliation
          </Button>
        }
      >
        {target ? (
          <div className="space-y-4 pb-2">
            <div className="rounded-2xl border border-line/85 bg-ink/40 p-4">
              <div className="flex items-center justify-between">
                <span className="label-caps">Ledger cash</span>
                <span className="font-mono text-lg font-semibold text-text">
                  {formatCurrency(target.cashCollected)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-line/70 pt-2">
                <span className="label-caps">Variance</span>
                <span
                  className={
                    Math.abs(variance) > 0.009
                      ? 'font-mono text-lg font-semibold text-danger'
                      : 'font-mono text-lg font-semibold text-success'
                  }
                >
                  {formatCurrency(variance)}
                </span>
              </div>
            </div>
            <TextField
              label="Counted amount"
              inputMode="decimal"
              value={counted}
              onChange={(event) => setCounted(event.target.value.replace(/[^\d.]/g, ''))}
              icon={<Banknote className="h-4 w-4" />}
              hint="Physical cash counted by the operator"
            />
            <TextField
              label={needsReason ? 'Variance reason (required)' : 'Note (optional)'}
              placeholder="Short by ₹20 — driver change error"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        ) : null}
      </BottomSheet>
    </div>
  )
}
