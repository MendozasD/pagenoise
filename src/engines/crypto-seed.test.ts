import { describe, it, expect } from 'vitest'
import { generateSeed, seedToHex, hexToSeed } from './crypto-seed'

describe('generateSeed', () => {
  it('returns a Uint8Array of 32 bytes', () => {
    const seed = generateSeed()
    expect(seed).toBeInstanceOf(Uint8Array)
    expect(seed.length).toBe(32)
  })

  it('produces different values on each call', () => {
    const a = generateSeed()
    const b = generateSeed()
    expect(seedToHex(a)).not.toBe(seedToHex(b))
  })
})

describe('seedToHex', () => {
  it('converts a Uint8Array to a lowercase hex string', () => {
    const seed = new Uint8Array([0, 1, 255, 16])
    expect(seedToHex(seed)).toBe('0001ff10')
  })

  it('returns a 64-character string for a 32-byte seed', () => {
    expect(seedToHex(generateSeed()).length).toBe(64)
  })
})

describe('hexToSeed', () => {
  it('roundtrips through seedToHex', () => {
    const original = generateSeed()
    const hex = seedToHex(original)
    const restored = hexToSeed(hex)
    expect(restored).toEqual(original)
  })

  it('throws on odd-length input', () => {
    expect(() => hexToSeed('abc')).toThrow('Invalid hex string')
  })

  it('throws on non-hex characters', () => {
    expect(() => hexToSeed('zz')).toThrow('Invalid hex string')
  })
})
