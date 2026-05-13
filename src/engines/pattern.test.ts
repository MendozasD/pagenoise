import { describe, it, expect } from 'vitest'
import { generatePattern, PAPER_DIMS } from './pattern'
import type { PatternConfig } from './pattern'

const baseConfig: PatternConfig = {
  seed: new Uint8Array(32).fill(42),
  paperSize: 'A4',
  patternType: 'stipple',
  inkDensity: 'medium',
}

describe('PAPER_DIMS', () => {
  it('contains A4, Letter, A5', () => {
    expect(PAPER_DIMS.A4).toEqual([595.28, 841.89])
    expect(PAPER_DIMS.Letter).toEqual([612, 792])
    expect(PAPER_DIMS.A5).toEqual([419.53, 595.28])
  })
})

describe('charrain pattern', () => {
  const config: PatternConfig = { ...baseConfig, patternType: 'charrain' }

  it('only produces char ops', () => {
    const ops = generatePattern(config)
    ops.forEach(op => expect(op.type).toBe('char'))
  })

  it('produces more ops at high density than low density', () => {
    const low = generatePattern({ ...config, inkDensity: 'low' })
    const high = generatePattern({ ...config, inkDensity: 'high' })
    expect(high.length).toBeGreaterThan(low.length)
  })

  it('all char ops have gray in [60, 255]', () => {
    const ops = generatePattern(config)
    ops.forEach(op => {
      if (op.type === 'char') {
        expect(op.gray).toBeGreaterThanOrEqual(60)
        expect(op.gray).toBeLessThanOrEqual(255)
      }
    })
  })
})

describe('generatePattern', () => {
  it('returns an array of DrawingOps', () => {
    const ops = generatePattern(baseConfig)
    expect(Array.isArray(ops)).toBe(true)
    expect(ops.length).toBeGreaterThan(0)
  })

  it('is deterministic — same seed produces same output', () => {
    const a = generatePattern(baseConfig)
    const b = generatePattern(baseConfig)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('produces different output for different seeds', () => {
    const other = { ...baseConfig, seed: new Uint8Array(32).fill(99) }
    const a = generatePattern(baseConfig)
    const b = generatePattern(other)
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('all ops have a valid type field', () => {
    const ops = generatePattern(baseConfig)
    const validTypes = new Set(['char', 'dot', 'line', 'rect'])
    ops.forEach(op => expect(validTypes.has(op.type)).toBe(true))
  })
})
