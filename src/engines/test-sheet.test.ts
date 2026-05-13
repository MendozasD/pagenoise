import { describe, it, expect } from 'vitest'
import { buildTestSheet } from './test-sheet'

describe('buildTestSheet', () => {
  it('returns a PDF Blob', async () => {
    const blob = await buildTestSheet('A4')
    const header = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).slice(0, 5))
      reader.onerror = reject
      reader.readAsText(blob)
    })
    expect(header).toBe('%PDF-')
  })

  it('works for all paper sizes', async () => {
    for (const size of ['A4', 'Letter', 'A5'] as const) {
      const blob = await buildTestSheet(size)
      expect(blob.size).toBeGreaterThan(500)
    }
  })
})
