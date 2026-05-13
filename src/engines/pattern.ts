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

const CHAR_POOL = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789@#$%&*!?+=<>'

function genCharRain(rand: () => number, width: number, height: number, density: InkDensity): DrawingOp[] {
  const spacing = { low: 14, medium: 11, high: 8 }[density]
  const baseSize = { low: 7, medium: 8.5, high: 10 }[density]
  const ops: DrawingOp[] = []
  for (let x = spacing / 2; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      const char = CHAR_POOL[Math.floor(rand() * CHAR_POOL.length)]
      const size = baseSize + (rand() - 0.5) * 3
      const rotation = (rand() - 0.5) * 25
      const gray = Math.floor(60 + rand() * 120)
      ops.push({ type: 'char', x, y, char, size, rotation, gray })
    }
  }
  return ops
}
function genStipple(rand: () => number, width: number, height: number, density: InkDensity): DrawingOp[] {
  const coverage = { low: 0.10, medium: 0.20, high: 0.35 }[density]
  const avgDotArea = Math.PI * 1.5 * 1.5
  const count = Math.floor((width * height * coverage) / avgDotArea)
  const ops: DrawingOp[] = []
  for (let i = 0; i < count; i++) {
    ops.push({
      type: 'dot',
      cx: rand() * width,
      cy: rand() * height,
      r: 0.8 + rand() * 1.4,
      gray: Math.floor(60 + rand() * 130),
    })
  }
  return ops
}
function genHatch(rand: () => number, width: number, height: number, density: InkDensity): DrawingOp[] {
  const spacing = { low: 11, medium: 7, high: 5 }[density]
  const lineWidth = { low: 0.4, medium: 0.5, high: 0.65 }[density]
  const diag = Math.sqrt(width * width + height * height)
  const cx = width / 2
  const cy = height / 2
  const ops: DrawingOp[] = []

  const angles = [35 + rand() * 15, 125 + rand() * 15]
  for (const baseAngle of angles) {
    const gray = Math.floor(100 + rand() * 100)
    const rad = (baseAngle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    let d = -diag
    while (d < diag * 2) {
      const jitter = rand() * spacing * 0.3
      ops.push({
        type: 'line',
        x1: cx + cos * (-diag) - sin * d,
        y1: cy + sin * (-diag) + cos * d,
        x2: cx + cos * diag - sin * d,
        y2: cy + sin * diag + cos * d,
        width: lineWidth,
        gray,
      })
      d += spacing + jitter
    }
  }
  return ops
}
function genGlitch(rand: () => number, width: number, height: number, density: InkDensity): DrawingOp[] {
  const minBarH = { low: 1.5, medium: 2, high: 3 }[density]
  const maxBarH = { low: 3, medium: 5, high: 7 }[density]
  const minGap  = { low: 4,   medium: 2, high: 1 }[density]
  const maxGap  = { low: 8,   medium: 5, high: 3 }[density]
  const ops: DrawingOp[] = []
  let y = 0
  while (y < height) {
    const barH  = minBarH + rand() * (maxBarH - minBarH)
    const gap   = minGap  + rand() * (maxGap  - minGap)
    const xOff  = (rand() - 0.5) * 14
    const barW  = width * (0.6 + rand() * 0.4)
    const gray  = Math.floor(80 + rand() * 120)
    ops.push({ type: 'rect', x: xOff, y, width: barW, height: barH, gray })
    y += barH + gap
  }
  return ops
}
