export type DrawingOp =
  | { type: 'char'; x: number; y: number; char: string; size: number; rotation: number; gray: number }
  | { type: 'dot'; cx: number; cy: number; r: number; gray: number }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; gray: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number; gray: number }

export type PaperSize = 'A4' | 'Letter' | 'A5'
export type PatternType = 'charrain' | 'stipple' | 'hatch' | 'glitch'
export type InkDensity = 'low' | 'medium' | 'high'

export interface PatternConfig {
  seed: Uint8Array
  paperSize: PaperSize
  patternType: PatternType
  inkDensity: InkDensity
}

export const PAPER_DIMS: Record<PaperSize, [number, number]> = {
  A4: [595.28, 841.89],
  Letter: [612, 792],
  A5: [419.53, 595.28],
}

// FNV-1a seed mixing into xorshift32 PRNG
export function makePrng(seed: Uint8Array): () => number {
  let state = 2166136261
  for (const byte of seed) {
    state ^= byte
    state = Math.imul(state, 16777619)
    state = state >>> 0
  }
  if (state === 0) state = 1
  return function () {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state = state >>> 0
    return state / 0xffffffff
  }
}

export function generatePattern(config: PatternConfig): DrawingOp[] {
  const rand = makePrng(config.seed)
  const [width, height] = PAPER_DIMS[config.paperSize]
  switch (config.patternType) {
    case 'charrain': return genCharRain(rand, width, height, config.inkDensity)
    case 'stipple':  return genStipple(rand, width, height, config.inkDensity)
    case 'hatch':    return genHatch(rand, width, height, config.inkDensity)
    case 'glitch':   return genGlitch(rand, width, height, config.inkDensity)
  }
}

// Placeholders — implemented in Tasks 4–7. Call rand() so output is seed-dependent.
function genCharRain(r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: r() * 100, cy: r() * 100, r: 1, gray: 128 }] }
function genStipple(r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: r() * 100, cy: r() * 100, r: 1, gray: 128 }] }
function genHatch(r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: r() * 100, cy: r() * 100, r: 1, gray: 128 }] }
function genGlitch(r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: r() * 100, cy: r() * 100, r: 1, gray: 128 }] }
