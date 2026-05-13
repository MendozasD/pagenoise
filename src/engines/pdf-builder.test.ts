import { describe, it, expect } from 'vitest'
import { buildPdf } from './pdf-builder'
import { generatePattern } from './pattern'

const singleDot = [{ type: 'dot' as const, cx: 100, cy: 100, r: 2, gray: 128 }]

describe('buildPdf', () => {
  it('returns a Blob', async () => {
    const blob = await buildPdf(singleDot, 'A4', 1)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('output starts with PDF header', async () => {
    const blob = await buildPdf(singleDot, 'A4', 1)
    const header = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).slice(0, 5))
      reader.onerror = reject
      reader.readAsText(blob)
    })
    expect(header).toBe('%PDF-')
  })

  it('generates a non-trivially sized PDF', async () => {
    const blob = await buildPdf(singleDot, 'A4', 1)
    expect(blob.size).toBeGreaterThan(500)
  })

  it('multi-page output is larger than single-page', async () => {
    const single = await buildPdf(singleDot, 'A4', 1)
    const multi  = await buildPdf(singleDot, 'A4', 3)
    expect(multi.size).toBeGreaterThan(single.size)
  })

  it('works with all pattern types', async () => {
    for (const patternType of ['charrain', 'stipple', 'hatch', 'glitch'] as const) {
      const ops = generatePattern({
        seed: new Uint8Array(32).fill(7),
        paperSize: 'A4',
        patternType,
        inkDensity: 'low',
      })
      const blob = await buildPdf(ops, 'A4', 1)
      expect(blob.size).toBeGreaterThan(1000)
    }
  })
})
