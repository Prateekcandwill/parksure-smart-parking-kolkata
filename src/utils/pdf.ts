import type { Receipt } from '@/types'
import { formatCurrency, formatDateTime } from '@/utils/format'

export async function downloadReceiptPdf(receipt: Receipt): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(11, 11, 15)
  doc.rect(0, 0, pageWidth, 112, 'F')
  doc.setTextColor(232, 194, 106)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.text('ParkSure', 48, 54)
  doc.setTextColor(245, 243, 236)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('PARK WITHOUT THE WAIT', 48, 74)
  doc.setTextColor(154, 154, 167)
  doc.text('Demo receipt · no real payment was processed', 48, 91)

  doc.setTextColor(20, 20, 26)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Payment receipt', 48, 154)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 102)
  doc.text(`Receipt no. ${receipt.number}`, 48, 176)
  doc.text(`Issued ${formatDateTime(receipt.issuedAt)}`, 48, 191)
  doc.text(`Customer ${receipt.userName}`, 48, 206)
  if (receipt.plate) doc.text(`Vehicle ${receipt.plate}`, 48, 221)
  if (receipt.placeName) doc.text(`Place ${receipt.placeName}`, 48, 236)

  doc.setDrawColor(226, 222, 210)
  doc.line(48, 258, pageWidth - 48, 258)

  let y = 284
  doc.setTextColor(20, 20, 26)
  doc.setFont('helvetica', 'bold')
  doc.text('Description', 48, y)
  doc.text('Amount', pageWidth - 48, y, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  y += 22

  receipt.lines.forEach((line) => {
    doc.setTextColor(60, 60, 72)
    doc.text(line.label, 48, y)
    doc.text(formatCurrency(line.amount), pageWidth - 48, y, { align: 'right' })
    y += 20
  })

  y += 8
  doc.setDrawColor(226, 222, 210)
  doc.line(48, y, pageWidth - 48, y)
  y += 24
  doc.setTextColor(60, 60, 72)
  doc.text('Subtotal', 48, y)
  doc.text(formatCurrency(receipt.subtotal), pageWidth - 48, y, { align: 'right' })
  y += 20
  doc.text('CGST (9%)', 48, y)
  doc.text(formatCurrency(receipt.cgst), pageWidth - 48, y, { align: 'right' })
  y += 20
  doc.text('SGST (9%)', 48, y)
  doc.text(formatCurrency(receipt.sgst), pageWidth - 48, y, { align: 'right' })
  y += 26

  doc.setFillColor(246, 241, 227)
  doc.roundedRect(40, y - 18, pageWidth - 80, 44, 8, 8, 'F')
  doc.setTextColor(20, 20, 26)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Total paid', 48, y + 8)
  doc.text(formatCurrency(receipt.total), pageWidth - 48, y + 8, { align: 'right' })

  y += 68
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 112)
  doc.text(`GSTIN ${receipt.gstin} (demo)`, 48, y)
  y += 14
  doc.text(receipt.notes, 48, y, { maxWidth: pageWidth - 96 })
  y += 28
  doc.text('ParkSure demo environment. This document is for interface testing only.', 48, y)

  doc.save(`${receipt.number}.pdf`)
}
