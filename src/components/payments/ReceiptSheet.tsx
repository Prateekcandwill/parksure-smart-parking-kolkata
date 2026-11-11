import { useState } from 'react'
import { Download, FileText, ShieldCheck } from 'lucide-react'
import type { Receipt } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { downloadReceiptPdf } from '@/utils/pdf'
import { toast } from '@/store/toast'

interface ReceiptSheetProps {
  receipt: Receipt | null
  open: boolean
  onClose: () => void
}

export function ReceiptSheet({ receipt, open, onClose }: ReceiptSheetProps) {
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    if (!receipt) return
    setDownloading(true)
    try {
      await downloadReceiptPdf(receipt)
      toast({ tone: 'success', title: 'Receipt downloaded', message: `${receipt.number}.pdf` })
    } catch {
      toast({ tone: 'error', title: 'Could not create the PDF', message: 'Try again from a modern browser.' })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <BottomSheet
      open={open && Boolean(receipt)}
      onClose={onClose}
      title="Payment receipt"
      description="Demo GST invoice for interface testing only."
      size="lg"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="lg" onClick={onClose}>
            Close
          </Button>
          <Button
            size="lg"
            loading={downloading}
            iconLeft={<Download className="h-4 w-4" />}
            onClick={download}
          >
            Download PDF
          </Button>
        </div>
      }
    >
      {receipt ? (
        <div className="space-y-4 pb-2">
          <div className="rounded-[24px] border border-line/85 bg-ink/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="label-caps">Receipt</div>
                <div className="mt-1 font-mono text-lg font-semibold text-text">{receipt.number}</div>
                <div className="mt-1 text-[11px] text-muted">Issued {formatDateTime(receipt.issuedAt)}</div>
              </div>
              <StatusBadge tone="success" label="Paid" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-3 text-[11px]">
              <div>
                <div className="text-muted">Customer</div>
                <div className="mt-0.5 font-semibold text-text">{receipt.userName}</div>
              </div>
              <div>
                <div className="text-muted">Vehicle</div>
                <div className="mt-0.5 font-mono font-semibold text-text">{receipt.plate ?? '—'}</div>
              </div>
              <div>
                <div className="text-muted">Place</div>
                <div className="mt-0.5 font-semibold text-text">{receipt.placeName ?? 'ParkSure'}</div>
              </div>
              <div>
                <div className="text-muted">GSTIN</div>
                <div className="mt-0.5 font-mono font-semibold text-text">{receipt.gstin}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-line/85 bg-raised/40 p-4">
            <div className="label-caps mb-3">Line items</div>
            <div className="space-y-2">
              {receipt.lines.map((line) => (
                <div key={line.label} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-muted">{line.label}</span>
                  <span className="font-mono font-semibold text-text">{formatCurrency(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 border-t border-line/70 pt-3 text-xs">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="font-mono text-text/85">{formatCurrency(receipt.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>CGST 9%</span>
                <span className="font-mono text-text/85">{formatCurrency(receipt.cgst)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>SGST 9%</span>
                <span className="font-mono text-text/85">{formatCurrency(receipt.sgst)}</span>
              </div>
              <div className="flex justify-between border-t border-line/70 pt-2 text-sm font-semibold text-text">
                <span>Total paid</span>
                <span className="font-mono text-accent">{formatCurrency(receipt.total)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-line/80 bg-surface/60 p-3 text-[11px] leading-relaxed text-muted">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>{receipt.notes}</span>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Stored locally in this browser
          </p>
        </div>
      ) : null}
    </BottomSheet>
  )
}
