import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { PAPER_DIMS } from './pattern'
import type { PaperSize } from './pattern'

type TextLine = { text: string; x: number; y: number; size: number; bold?: boolean }

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim())
      current = word
    } else {
      current = (current + ' ' + word).trim()
    }
  }
  if (current) lines.push(current.trim())
  return lines
}

export async function buildTestSheet(paperSize: PaperSize): Promise<Blob> {
  const [width, height] = PAPER_DIMS[paperSize]
  const doc = await PDFDocument.create()
  const page = doc.addPage([width, height])
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold)

  const black = rgb(0, 0, 0)
  const gray  = rgb(0.3, 0.3, 0.3)
  const margin = 40
  let y = height - 36

  function line({ text, x, y: lineY, size, bold: isBold = false }: TextLine) {
    page.drawText(text, { x, y: lineY, size, font: isBold ? bold : regular, color: black })
  }

  // Header
  line({ text: 'PAPER SANITIZER — TEST REFERENCE SHEET', x: margin, y, size: 9, bold: true })
  y -= 13
  page.drawText('Print this page. Overlay each pattern type and assess coverage.', { x: margin, y, size: 8, font: regular, color: gray })
  y -= 6
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: gray })
  y -= 18

  // Personal data block
  line({ text: 'PERSONAL INFORMATION', x: margin, y, size: 7.5, bold: true })
  y -= 14
  const personalLines = [
    'Full Name:       David Alexander Mendoza Sommer',
    'Address:         Musterstrasse 14, 3014 Bern, Switzerland',
    'Date of Birth:   15.03.1990',
    'Nationality:     Swiss / German   ID No: A1234567',
    'AHV-Nr:          756.1234.5678.97',
  ]
  for (const t of personalLines) {
    line({ text: t, x: margin, y, size: 10 })
    y -= 14
  }
  y -= 6

  // Financial block
  line({ text: 'FINANCIAL DATA', x: margin, y, size: 7.5, bold: true })
  y -= 14
  const financialLines = [
    'IBAN:            CH56 0483 5012 3456 7800 9',
    'Account No:      12-345678-9',
    'BIC/SWIFT:       UBSWCHZH80A',
    'Tax ID:          CHE-123.456.789',
    'Credit Card:     4111 1111 1111 1111   Exp: 12/28   CVV: 123',
  ]
  for (const t of financialLines) {
    line({ text: t, x: margin, y, size: 10 })
    y -= 14
  }
  y -= 6

  // Dense paragraph
  line({ text: 'DENSE TEXT (10pt) — most sensitive document body copy', x: margin, y, size: 7.5, bold: true })
  y -= 14
  const para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.'
  const wrapped = wrapText(para, Math.floor((width - margin * 2) / 6))
  for (const t of wrapped) {
    line({ text: t, x: margin, y, size: 10 })
    y -= 14
    if (y < 120) break
  }
  y -= 6

  // Table
  line({ text: 'DATA TABLE (tests column & row coverage)', x: margin, y, size: 7.5, bold: true })
  y -= 14
  const cols = [margin, margin + 160, margin + 320]
  const tableHeader = ['Name', 'Policy No.', 'Amount (CHF)']
  const tableRows = [
    ['Müller, Hans',       'POL-2024-001', '12\'450.00'],
    ['García López, Ana',  'POL-2024-002', '8\'200.50'],
    ['Schmidt, Klaus W.',  'POL-2024-003', '34\'900.00'],
    ['Nguyen, Thi Lan',    'POL-2024-004', '5\'670.25'],
  ]
  for (let i = 0; i < tableHeader.length; i++) {
    line({ text: tableHeader[i], x: cols[i], y, size: 9, bold: true })
  }
  y -= 12
  for (const row of tableRows) {
    for (let i = 0; i < row.length; i++) {
      line({ text: row[i], x: cols[i], y, size: 10 })
    }
    y -= 14
  }
  y -= 10

  // Signature line
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 180, y }, thickness: 0.5, color: black })
  y -= 12
  line({ text: 'Signature & Date', x: margin, y, size: 8 })

  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
