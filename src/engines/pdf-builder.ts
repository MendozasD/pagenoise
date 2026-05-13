import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { PAPER_DIMS } from './pattern'
import type { DrawingOp, PaperSize } from './pattern'

function grayColor(gray: number) {
  const v = gray / 255
  return rgb(v, v, v)
}

async function buildSinglePage(doc: PDFDocument, ops: DrawingOp[], paperSize: PaperSize) {
  const [width, height] = PAPER_DIMS[paperSize]
  const page = doc.addPage([width, height])
  const font = await doc.embedFont(StandardFonts.Courier)

  for (const op of ops) {
    switch (op.type) {
      case 'char':
        page.drawText(op.char, {
          x: op.x,
          y: height - op.y,          // flip Y: pdf-lib is bottom-left origin
          size: Math.max(1, op.size),
          font,
          color: grayColor(op.gray),
          rotate: degrees(op.rotation),
        })
        break

      case 'dot':
        page.drawCircle({
          x: op.cx,
          y: height - op.cy,
          size: Math.max(0.5, op.r),
          color: grayColor(op.gray),
          borderWidth: 0,
        })
        break

      case 'line':
        page.drawLine({
          start: { x: op.x1, y: height - op.y1 },
          end:   { x: op.x2, y: height - op.y2 },
          thickness: Math.max(0.1, op.width),
          color: grayColor(op.gray),
        })
        break

      case 'rect':
        page.drawRectangle({
          x: op.x,
          y: height - op.y - op.height,  // pdf-lib rect origin is bottom-left of rect
          width:  Math.max(0.1, op.width),
          height: Math.max(0.1, op.height),
          color: grayColor(op.gray),
          borderWidth: 0,
        })
        break
    }
  }
}

export async function buildPdf(ops: DrawingOp[], paperSize: PaperSize, pageCount: number): Promise<Blob> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    await buildSinglePage(doc, ops, paperSize)
  }
  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
