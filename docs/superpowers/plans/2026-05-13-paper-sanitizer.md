# Paper Sanitizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only React app that generates cryptographically-seeded obfuscation PDFs for printing over sensitive documents before recycling.

**Architecture:** Three isolated layers — Pattern Engine (pure TS, no framework), PDF Builder (pdf-lib wrapper), UI (React). The engine is framework-agnostic so it can be extracted into a CLI or Tauri wrapper in v2 without changes. All processing is client-side; nothing leaves the browser.

**Tech Stack:** React 18 + Vite + TypeScript, pdf-lib, Web Crypto API, Vitest + jsdom

---

## File Map

| File | Responsibility |
|---|---|
| `src/engines/crypto-seed.ts` | `generateSeed()`, `seedToHex()`, `hexToSeed()` — Web Crypto wrappers |
| `src/engines/pattern.ts` | Types (`DrawingOp`, `PatternConfig`), PRNG, four pattern generators |
| `src/engines/pdf-builder.ts` | `buildPdf(ops, size, pageCount)` → `Promise<Blob>` using pdf-lib |
| `src/engines/test-sheet.ts` | `buildTestSheet(size)` → `Promise<Blob>` — fixed reference page |
| `src/components/SeedDisplay.tsx` | Shows hex seed; copy + regenerate buttons |
| `src/components/SettingsPanel.tsx` | Page count, paper size, pattern type, ink density controls |
| `src/components/PreviewPanel.tsx` | Live SVG render of current pattern ops |
| `src/components/SmartModeLock.tsx` | Static v2 placeholder card — no logic |
| `src/App.tsx` | Root: holds all state, wires components, handles generate + download |
| `src/App.css` | All styles — light/dark tokens, layout, component styles |

**Coordinate system:** Pattern Engine and SVG preview use top-left origin (points). PDF Builder flips Y before writing to pdf-lib (which uses bottom-left origin).

---

## Task 1: Project Scaffolding

**Files:**
- Create: project root (Vite scaffold)
- Modify: `vite.config.ts`, `package.json`, `.gitignore`

- [ ] **Step 1: Scaffold the Vite project**

```bash
cd /Users/david/projects/paper-sanitizer
npm create vite@latest . -- --template react-ts
```

When prompted about existing files, choose to ignore / keep existing.

- [ ] **Step 2: Install dependencies**

```bash
npm install pdf-lib
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @types/node
```

- [ ] **Step 3: Configure Vitest in vite.config.ts**

Replace the entire file:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create test setup file**

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

Add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Update .gitignore**

Append to the existing `.gitignore`:
```
.superpowers/
dist/
```

- [ ] **Step 7: Delete Vite boilerplate**

```bash
rm -f src/App.css src/index.css src/assets/react.svg public/vite.svg src/App.tsx
```

- [ ] **Step 8: Verify setup**

```bash
npm run test
```

Expected: `No test files found` (exit 0 or similar — not an error).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project with Vitest"
```

---

## Task 2: Crypto Seed Engine

**Files:**
- Create: `src/engines/crypto-seed.ts`
- Create: `src/engines/crypto-seed.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/engines/crypto-seed.test.ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './crypto-seed'`

- [ ] **Step 3: Implement the module**

```typescript
// src/engines/crypto-seed.ts
export function generateSeed(): Uint8Array {
  const seed = new Uint8Array(32)
  crypto.getRandomValues(seed)
  return seed
}

export function seedToHex(seed: Uint8Array): string {
  return Array.from(seed)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function hexToSeed(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error('Invalid hex string')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/engines/
git commit -m "feat: add crypto-seed engine with generateSeed, seedToHex, hexToSeed"
```

---

## Task 3: Pattern Engine — Types and PRNG

**Files:**
- Create: `src/engines/pattern.ts`
- Create: `src/engines/pattern.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/engines/pattern.test.ts
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './pattern'`

- [ ] **Step 3: Implement types, PRNG, and skeleton**

```typescript
// src/engines/pattern.ts
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

// Placeholders — implemented in Tasks 4–7
function genCharRain(_r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: 0, cy: 0, r: 1, gray: 128 }] }
function genStipple(_r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: 0, cy: 0, r: 1, gray: 128 }] }
function genHatch(_r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: 0, cy: 0, r: 1, gray: 128 }] }
function genGlitch(_r: () => number, _w: number, _h: number, _d: InkDensity): DrawingOp[] { return [{ type: 'dot', cx: 0, cy: 0, r: 1, gray: 128 }] }
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS — all pattern tests

- [ ] **Step 5: Commit**

```bash
git add src/engines/pattern.ts src/engines/pattern.test.ts
git commit -m "feat: add pattern engine types, PRNG, and skeleton generators"
```

---

## Task 4: Pattern Engine — Character Rain

**Files:**
- Modify: `src/engines/pattern.ts` (replace `genCharRain` placeholder)
- Modify: `src/engines/pattern.test.ts` (add charrain-specific tests)

- [ ] **Step 1: Add failing tests**

Append to `src/engines/pattern.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL — `expect(op.type).toBe('char')` because placeholder returns dot ops.

- [ ] **Step 3: Implement genCharRain**

Replace the `genCharRain` placeholder in `src/engines/pattern.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engines/pattern.ts src/engines/pattern.test.ts
git commit -m "feat: implement Character Rain pattern generator"
```

---

## Task 5: Pattern Engine — Stipple

**Files:**
- Modify: `src/engines/pattern.ts` (replace `genStipple` placeholder)
- Modify: `src/engines/pattern.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/engines/pattern.test.ts`:

```typescript
describe('stipple pattern', () => {
  const config: PatternConfig = { ...baseConfig, patternType: 'stipple' }

  it('only produces dot ops', () => {
    const ops = generatePattern(config)
    ops.forEach(op => expect(op.type).toBe('dot'))
  })

  it('produces more dots at high density', () => {
    const low = generatePattern({ ...config, inkDensity: 'low' })
    const high = generatePattern({ ...config, inkDensity: 'high' })
    expect(high.length).toBeGreaterThan(low.length)
  })

  it('all dots have positive radius', () => {
    const ops = generatePattern(config)
    ops.forEach(op => {
      if (op.type === 'dot') expect(op.r).toBeGreaterThan(0)
    })
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL

- [ ] **Step 3: Implement genStipple**

Replace the `genStipple` placeholder in `src/engines/pattern.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engines/pattern.ts src/engines/pattern.test.ts
git commit -m "feat: implement Stipple pattern generator"
```

---

## Task 6: Pattern Engine — Cross-Hatch

**Files:**
- Modify: `src/engines/pattern.ts` (replace `genHatch` placeholder)
- Modify: `src/engines/pattern.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/engines/pattern.test.ts`:

```typescript
describe('hatch pattern', () => {
  const config: PatternConfig = { ...baseConfig, patternType: 'hatch' }

  it('only produces line ops', () => {
    const ops = generatePattern(config)
    ops.forEach(op => expect(op.type).toBe('line'))
  })

  it('all lines have positive width', () => {
    const ops = generatePattern(config)
    ops.forEach(op => {
      if (op.type === 'line') expect(op.width).toBeGreaterThan(0)
    })
  })

  it('produces more lines at high density', () => {
    const low = generatePattern({ ...config, inkDensity: 'low' })
    const high = generatePattern({ ...config, inkDensity: 'high' })
    expect(high.length).toBeGreaterThan(low.length)
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL

- [ ] **Step 3: Implement genHatch**

Replace the `genHatch` placeholder in `src/engines/pattern.ts`:

```typescript
function genHatch(rand: () => number, width: number, height: number, density: InkDensity): DrawingOp[] {
  const spacing = { low: 11, medium: 7, high: 5 }[density]
  const lineWidth = { low: 0.4, medium: 0.5, high: 0.65 }[density]
  const diag = Math.sqrt(width * width + height * height)
  const cx = width / 2
  const cy = height / 2
  const ops: DrawingOp[] = []

  // Two line families at angles derived from PRNG
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engines/pattern.ts src/engines/pattern.test.ts
git commit -m "feat: implement Cross-Hatch pattern generator"
```

---

## Task 7: Pattern Engine — Glitch Bars

**Files:**
- Modify: `src/engines/pattern.ts` (replace `genGlitch` placeholder)
- Modify: `src/engines/pattern.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/engines/pattern.test.ts`:

```typescript
describe('glitch pattern', () => {
  const config: PatternConfig = { ...baseConfig, patternType: 'glitch' }

  it('only produces rect ops', () => {
    const ops = generatePattern(config)
    ops.forEach(op => expect(op.type).toBe('rect'))
  })

  it('all rects have positive width and height', () => {
    const ops = generatePattern(config)
    ops.forEach(op => {
      if (op.type === 'rect') {
        expect(op.width).toBeGreaterThan(0)
        expect(op.height).toBeGreaterThan(0)
      }
    })
  })

  it('covers the full page height', () => {
    const ops = generatePattern(config)
    const [, pageHeight] = PAPER_DIMS['A4']
    const lastRect = ops[ops.length - 1]
    if (lastRect.type === 'rect') {
      expect(lastRect.y + lastRect.height).toBeGreaterThanOrEqual(pageHeight * 0.9)
    }
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL

- [ ] **Step 3: Implement genGlitch**

Replace the `genGlitch` placeholder in `src/engines/pattern.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS — all pattern tests across all four types

- [ ] **Step 5: Commit**

```bash
git add src/engines/pattern.ts src/engines/pattern.test.ts
git commit -m "feat: implement Glitch Bars pattern generator — all four patterns complete"
```

---

## Task 8: PDF Builder

**Files:**
- Create: `src/engines/pdf-builder.ts`
- Create: `src/engines/pdf-builder.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/engines/pdf-builder.test.ts
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
    const header = await blob.slice(0, 5).text()
    expect(header).toBe('%PDF-')
  })

  it('generates a non-trivially sized PDF', async () => {
    const blob = await buildPdf(singleDot, 'A4', 1)
    expect(blob.size).toBeGreaterThan(1000)
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
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './pdf-builder'`

- [ ] **Step 3: Implement the PDF builder**

```typescript
// src/engines/pdf-builder.ts
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { DrawingOp, PAPER_DIMS, PaperSize } from './pattern'

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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS — all 5 pdf-builder tests + all previous tests

- [ ] **Step 5: Commit**

```bash
git add src/engines/pdf-builder.ts src/engines/pdf-builder.test.ts
git commit -m "feat: add PDF builder wrapping pdf-lib — converts DrawingOps to downloadable PDF"
```

---

## Task 9: Test Sheet Generator

**Files:**
- Create: `src/engines/test-sheet.ts`
- Create: `src/engines/test-sheet.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/engines/test-sheet.test.ts
import { describe, it, expect } from 'vitest'
import { buildTestSheet } from './test-sheet'

describe('buildTestSheet', () => {
  it('returns a PDF Blob', async () => {
    const blob = await buildTestSheet('A4')
    const header = await blob.slice(0, 5).text()
    expect(header).toBe('%PDF-')
  })

  it('works for all paper sizes', async () => {
    for (const size of ['A4', 'Letter', 'A5'] as const) {
      const blob = await buildTestSheet(size)
      expect(blob.size).toBeGreaterThan(1000)
    }
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL — `Cannot find module './test-sheet'`

- [ ] **Step 3: Implement the test sheet**

```typescript
// src/engines/test-sheet.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { PAPER_DIMS, PaperSize } from './pattern'

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

  // Dense paragraph (10pt) — tests small text coverage
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

  // Table — tests column alignment and varied content
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS — all tests including the two new test-sheet tests

- [ ] **Step 5: Commit**

```bash
git add src/engines/test-sheet.ts src/engines/test-sheet.test.ts
git commit -m "feat: add test sheet generator with realistic sensitive document layout"
```

---

## Task 10: React Components

**Files:**
- Create: `src/components/SeedDisplay.tsx`
- Create: `src/components/SettingsPanel.tsx`
- Create: `src/components/PreviewPanel.tsx`
- Create: `src/components/SmartModeLock.tsx`

All four components are created in this task. They have no side-effects and are tested via React Testing Library.

- [ ] **Step 1: Write the failing component tests**

```typescript
// src/components/components.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SeedDisplay } from './SeedDisplay'
import { SettingsPanel } from './SettingsPanel'
import { SmartModeLock } from './SmartModeLock'

const mockSeed = new Uint8Array(32).fill(1)

describe('SeedDisplay', () => {
  it('renders a hex string', () => {
    render(<SeedDisplay seed={mockSeed} onRegenerate={() => {}} />)
    // 32 bytes → 64 hex chars; first 8: '01010101'
    expect(screen.getByText(/0101010101010101/)).toBeInTheDocument()
  })

  it('calls onRegenerate when button is clicked', () => {
    const fn = vi.fn()
    render(<SeedDisplay seed={mockSeed} onRegenerate={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))
    expect(fn).toHaveBeenCalledOnce()
  })
})

describe('SettingsPanel', () => {
  const defaults = {
    pageCount: 1,
    paperSize: 'A4' as const,
    patternType: 'stipple' as const,
    inkDensity: 'medium' as const,
    onPageCountChange: vi.fn(),
    onPaperSizeChange: vi.fn(),
    onPatternTypeChange: vi.fn(),
    onInkDensityChange: vi.fn(),
  }

  it('renders page count input with correct value', () => {
    render(<SettingsPanel {...defaults} />)
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
  })

  it('calls onPatternTypeChange when pattern is changed', () => {
    const fn = vi.fn()
    render(<SettingsPanel {...defaults} onPatternTypeChange={fn} />)
    fireEvent.change(screen.getByLabelText(/pattern/i), { target: { value: 'hatch' } })
    expect(fn).toHaveBeenCalledWith('hatch')
  })
})

describe('SmartModeLock', () => {
  it('renders a v2 coming soon message', () => {
    render(<SmartModeLock />)
    expect(screen.getByText(/smart mode/i)).toBeInTheDocument()
    expect(screen.getByText(/v2/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm they fail**

```bash
npm run test
```

Expected: FAIL — components don't exist yet

- [ ] **Step 3: Implement SeedDisplay**

```typescript
// src/components/SeedDisplay.tsx
import { seedToHex } from '../engines/crypto-seed'

interface Props {
  seed: Uint8Array
  onRegenerate: () => void
}

export function SeedDisplay({ seed, onRegenerate }: Props) {
  const hex = seedToHex(seed)

  function handleCopy() {
    navigator.clipboard.writeText(hex)
  }

  return (
    <div className="seed-display">
      <label className="field-label">Seed</label>
      <div className="seed-row">
        <code className="seed-hex">{hex}</code>
        <button type="button" onClick={handleCopy} className="btn-icon" title="Copy seed">
          Copy
        </button>
        <button type="button" onClick={onRegenerate} className="btn-icon" title="Regenerate seed">
          Regenerate
        </button>
      </div>
      <p className="seed-hint">Same seed + same settings = identical pattern. Save it to reproduce later.</p>
    </div>
  )
}
```

- [ ] **Step 4: Implement SettingsPanel**

```typescript
// src/components/SettingsPanel.tsx
import type { PaperSize, PatternType, InkDensity } from '../engines/pattern'

interface Props {
  pageCount: number
  paperSize: PaperSize
  patternType: PatternType
  inkDensity: InkDensity
  onPageCountChange: (v: number) => void
  onPaperSizeChange: (v: PaperSize) => void
  onPatternTypeChange: (v: PatternType) => void
  onInkDensityChange: (v: InkDensity) => void
}

export function SettingsPanel({
  pageCount, paperSize, patternType, inkDensity,
  onPageCountChange, onPaperSizeChange, onPatternTypeChange, onInkDensityChange,
}: Props) {
  return (
    <div className="settings-panel">
      <div className="field">
        <label className="field-label" htmlFor="page-count">Pages</label>
        <input
          id="page-count"
          type="number"
          min={1}
          max={50}
          value={pageCount}
          onChange={e => onPageCountChange(Math.min(50, Math.max(1, Number(e.target.value))))}
          className="input-number"
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="paper-size">Paper size</label>
        <select
          id="paper-size"
          value={paperSize}
          onChange={e => onPaperSizeChange(e.target.value as PaperSize)}
          className="input-select"
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="A5">A5</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="pattern-type">Pattern</label>
        <select
          id="pattern-type"
          value={patternType}
          onChange={e => onPatternTypeChange(e.target.value as PatternType)}
          className="input-select"
        >
          <option value="charrain">Character Rain</option>
          <option value="stipple">Stipple</option>
          <option value="hatch">Cross-Hatch</option>
          <option value="glitch">Glitch Bars</option>
        </select>
      </div>

      <div className="field">
        <label className="field-label">Ink density</label>
        <div className="segmented">
          {(['low', 'medium', 'high'] as InkDensity[]).map(d => (
            <button
              key={d}
              type="button"
              className={`seg-btn ${inkDensity === d ? 'seg-btn--active' : ''}`}
              onClick={() => onInkDensityChange(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implement PreviewPanel**

```typescript
// src/components/PreviewPanel.tsx
import { useMemo } from 'react'
import { generatePattern, PAPER_DIMS } from '../engines/pattern'
import type { PatternConfig } from '../engines/pattern'

interface Props {
  config: PatternConfig
}

const PREVIEW_WIDTH = 260

export function PreviewPanel({ config }: Props) {
  const [pageW, pageH] = PAPER_DIMS[config.paperSize]
  const previewH = (pageH / pageW) * PREVIEW_WIDTH

  // Use low density for preview regardless of setting — keeps rendering fast
  const previewConfig = useMemo(() => ({ ...config, inkDensity: 'low' as const }), [
    config.seed,
    config.paperSize,
    config.patternType,
  ])

  const ops = useMemo(() => generatePattern(previewConfig), [previewConfig])

  return (
    <div className="preview-panel">
      <p className="field-label">Preview</p>
      <div className="preview-frame">
        <svg
          viewBox={`0 0 ${pageW} ${pageH}`}
          width={PREVIEW_WIDTH}
          height={previewH}
          style={{ background: 'white', display: 'block' }}
        >
          {ops.map((op, i) => {
            switch (op.type) {
              case 'char':
                return (
                  <text
                    key={i}
                    x={op.x}
                    y={op.y}
                    fontSize={op.size}
                    fontFamily="monospace"
                    fill={`rgb(${op.gray},${op.gray},${op.gray})`}
                    transform={`rotate(${op.rotation},${op.x},${op.y})`}
                  >
                    {op.char}
                  </text>
                )
              case 'dot':
                return <circle key={i} cx={op.cx} cy={op.cy} r={op.r} fill={`rgb(${op.gray},${op.gray},${op.gray})`} />
              case 'line':
                return (
                  <line
                    key={i}
                    x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2}
                    stroke={`rgb(${op.gray},${op.gray},${op.gray})`}
                    strokeWidth={op.width}
                  />
                )
              case 'rect':
                return (
                  <rect
                    key={i}
                    x={op.x} y={op.y}
                    width={op.width} height={op.height}
                    fill={`rgb(${op.gray},${op.gray},${op.gray})`}
                  />
                )
            }
          })}
        </svg>
      </div>
      <p className="preview-note">Preview uses low density. Print is the ground truth.</p>
    </div>
  )
}
```

- [ ] **Step 6: Implement SmartModeLock**

```typescript
// src/components/SmartModeLock.tsx
export function SmartModeLock() {
  return (
    <div className="smart-mode-lock">
      <div className="smart-mode-icon">🔒</div>
      <h3 className="smart-mode-title">Smart Mode</h3>
      <p className="smart-mode-desc">
        Upload a scan of your page — the pattern targets ink exactly where your text sits.
        Coming in <strong>v2</strong> once our client-side OCR clears the coverage threshold.
      </p>
      <span className="smart-mode-badge">v2</span>
    </div>
  )
}
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
npm run test
```

Expected: PASS — all component tests + all previous engine tests

- [ ] **Step 8: Commit**

```bash
git add src/components/
git commit -m "feat: add all four UI components — SeedDisplay, SettingsPanel, PreviewPanel, SmartModeLock"
```

---

## Task 11: App Wiring

**Files:**
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement App.tsx**

```typescript
// src/App.tsx
import { useState, useCallback } from 'react'
import { generateSeed } from './engines/crypto-seed'
import { generatePattern } from './engines/pattern'
import { buildPdf } from './engines/pdf-builder'
import { buildTestSheet } from './engines/test-sheet'
import { seedToHex } from './engines/crypto-seed'
import { SeedDisplay } from './components/SeedDisplay'
import { SettingsPanel } from './components/SettingsPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { SmartModeLock } from './components/SmartModeLock'
import type { PaperSize, PatternType, InkDensity } from './engines/pattern'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export default function App() {
  const [seed, setSeed] = useState<Uint8Array>(generateSeed)
  const [pageCount, setPageCount] = useState(1)
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')
  const [patternType, setPatternType] = useState<PatternType>('charrain')
  const [inkDensity, setInkDensity] = useState<InkDensity>('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  const patternConfig = { seed, paperSize, patternType, inkDensity }

  const handleRegenerate = useCallback(() => setSeed(generateSeed()), [])

  async function handleGenerate() {
    setIsGenerating(true)
    setError(null)
    try {
      const ops = generatePattern(patternConfig)
      const blob = await buildPdf(ops, paperSize, pageCount)
      downloadBlob(blob, `sanitizer-${seedToHex(seed).slice(0, 8)}-${pageCount}p.pdf`)
    } catch {
      setError('PDF generation failed — try regenerating the seed')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleTestSheet() {
    setIsGenerating(true)
    setError(null)
    try {
      const blob = await buildTestSheet(paperSize)
      downloadBlob(blob, `sanitizer-test-sheet-${paperSize}.pdf`)
    } catch {
      setError('Test sheet generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <header className="app-header">
        <div className="app-brand">
          <span className="app-icon">🌿</span>
          <div>
            <h1 className="app-title">Paper Sanitizer</h1>
            <p className="app-subtitle">Eco-friendly document privacy</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-icon"
          onClick={() => setDarkMode(d => !d)}
          title="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <main className="app-main">
        <section className="panel panel--settings">
          <SettingsPanel
            pageCount={pageCount}
            paperSize={paperSize}
            patternType={patternType}
            inkDensity={inkDensity}
            onPageCountChange={setPageCount}
            onPaperSizeChange={setPaperSize}
            onPatternTypeChange={setPatternType}
            onInkDensityChange={setInkDensity}
          />
          <SeedDisplay seed={seed} onRegenerate={handleRegenerate} />

          {error && <p className="error-toast">{error}</p>}

          <div className="action-row">
            <button
              type="button"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating…' : `Generate ${pageCount} page${pageCount > 1 ? 's' : ''}`}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTestSheet}
              disabled={isGenerating}
            >
              Download test sheet
            </button>
          </div>
        </section>

        <section className="panel panel--preview">
          <PreviewPanel config={patternConfig} />
          <SmartModeLock />
        </section>
      </main>

      <footer className="app-footer">
        <p>All processing happens in your browser. Nothing is uploaded. Ever.</p>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">Open source on GitHub ↗</a>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Update main.tsx**

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
npm run test
```

Expected: PASS — all previous tests still green

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: wire App — connects all engines and components, handles generate and download"
```

---

## Task 12: Styling

**Files:**
- Create: `src/App.css`

**Rules from project memory:**
- Light/dark mode toggle required
- Body font size ≥ 15px

- [ ] **Step 1: Write App.css**

```css
/* src/App.css */
/* ── Tokens ── */
:root {
  --bg: #f8f7f4;
  --surface: #ffffff;
  --border: #e2e0da;
  --text: #1a1917;
  --text-muted: #6b6860;
  --primary: #2d6a4f;
  --primary-hover: #1b4332;
  --primary-text: #ffffff;
  --secondary-bg: #edf2ef;
  --secondary-hover: #d8e8df;
  --error: #c0392b;
  --radius: 8px;
  --shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.dark {
  --bg: #12110f;
  --surface: #1e1c1a;
  --border: #2e2c29;
  --text: #f0ede8;
  --text-muted: #8a8680;
  --primary: #52b788;
  --primary-hover: #74c69d;
  --primary-text: #0d1f17;
  --secondary-bg: #252320;
  --secondary-hover: #2e2c29;
}

/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  line-height: 1.6;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

/* ── Layout ── */
.app { min-height: 100vh; display: flex; flex-direction: column; }

.app-header {
  padding: 16px 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.app-brand { display: flex; align-items: center; gap: 12px; }
.app-icon { font-size: 28px; }
.app-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
.app-subtitle { font-size: 13px; color: var(--text-muted); }

.app-main {
  flex: 1;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 0;
  max-width: 900px;
  margin: 32px auto;
  width: 100%;
  padding: 0 16px;
}

@media (max-width: 680px) {
  .app-main { grid-template-columns: 1fr; }
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.panel--settings { display: flex; flex-direction: column; gap: 20px; }
.panel--preview {
  margin-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: flex-start;
}

@media (max-width: 680px) {
  .panel--preview { margin-left: 0; margin-top: 16px; }
}

/* ── Fields ── */
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-muted);
}

.input-number,
.input-select {
  font-size: 15px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  width: 100%;
}

.input-number:focus,
.input-select:focus {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}

/* ── Segmented control ── */
.segmented { display: flex; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }

.seg-btn {
  flex: 1;
  padding: 8px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.seg-btn + .seg-btn { border-left: 1px solid var(--border); }

.seg-btn--active {
  background: var(--primary);
  color: var(--primary-text);
}

/* ── Seed display ── */
.seed-display { display: flex; flex-direction: column; gap: 6px; }
.seed-row { display: flex; align-items: center; gap: 6px; overflow: hidden; }

.seed-hex {
  font-family: monospace;
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  background: var(--bg);
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.seed-hint { font-size: 12px; color: var(--text-muted); }

/* ── Buttons ── */
.btn-primary {
  flex: 1;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 600;
  background: var(--primary);
  color: var(--primary-text);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-secondary {
  flex: 1;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  background: var(--secondary-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover:not(:disabled) { background: var(--secondary-hover); }
.btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-icon {
  padding: 6px 10px;
  font-size: 13px;
  background: var(--secondary-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-icon:hover { background: var(--secondary-hover); }

.action-row { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── Error toast ── */
.error-toast {
  padding: 10px 14px;
  background: #fdf0ee;
  border: 1px solid #f5c6c2;
  border-radius: var(--radius);
  color: var(--error);
  font-size: 14px;
}

.dark .error-toast { background: #2a1512; border-color: #5a2020; }

/* ── Preview ── */
.preview-panel { display: flex; flex-direction: column; gap: 8px; }
.preview-frame {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}
.preview-note { font-size: 12px; color: var(--text-muted); }

/* ── Smart Mode Lock ── */
.smart-mode-lock {
  position: relative;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
  opacity: 0.75;
  width: 100%;
}

.smart-mode-icon { font-size: 28px; margin-bottom: 8px; }
.smart-mode-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.smart-mode-desc { font-size: 14px; color: var(--text-muted); line-height: 1.5; }

.smart-mode-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 11px;
  font-weight: 700;
  background: var(--primary);
  color: var(--primary-text);
  padding: 2px 7px;
  border-radius: 20px;
}

/* ── Settings panel ── */
.settings-panel { display: flex; flex-direction: column; gap: 16px; }

/* ── Footer ── */
.app-footer {
  padding: 16px 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.app-footer a { color: var(--primary); text-decoration: none; }
.app-footer a:hover { text-decoration: underline; }
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: PASS — CSS doesn't affect unit tests

- [ ] **Step 3: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:5173`. Check:
- Layout renders without errors in browser console
- Dark mode toggle switches theme
- All controls are visible and functional
- Preview updates when pattern type changes

- [ ] **Step 4: Commit**

```bash
git add src/App.css
git commit -m "feat: add full CSS with light/dark tokens, layout, and component styles"
```

---

## Task 13: Deploy Configuration

**Files:**
- Create: `public/.nojekyll`
- Modify: `vite.config.ts`
- Create: `LICENSE`

- [ ] **Step 1: Add GitHub Pages base path to vite.config.ts**

In `vite.config.ts`, add `base` to the `defineConfig` call. Replace the export:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 2: Add .nojekyll for GitHub Pages**

```bash
touch public/.nojekyll
```

- [ ] **Step 3: Add MIT license**

```
LICENSE
```

Content:
```
MIT License

Copyright (c) 2026 David Mendoza Sommer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Verify production build**

```bash
npm run build
```

Expected: `dist/` folder created, no errors.

- [ ] **Step 5: Run full test suite one final time**

```bash
npm run test
```

Expected: PASS — all tests green

- [ ] **Step 6: Final commit**

```bash
git add vite.config.ts public/.nojekyll LICENSE
git commit -m "feat: add deploy config for GitHub Pages + MIT license"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Blind mode — full workflow | Tasks 2–9, 11 |
| Four pattern types | Tasks 4–7 |
| Web Crypto CSPRNG seed | Task 2 |
| Seed visible + copyable + reproducible | Tasks 2, 10 |
| Page count 1–50 | Task 10 |
| Paper sizes A4/Letter/A5 | Tasks 3, 8, 9 |
| Ink density Low/Medium/High | Tasks 4–7, 10 |
| Live SVG preview | Task 10 |
| Smart Mode placeholder (no dead code) | Task 10 |
| Test sheet generator | Task 9 |
| PDF download with correct filename | Task 11 |
| URL.revokeObjectURL after 60s | Task 11 |
| pdf-lib error → user toast | Task 11 |
| Invalid page count clamped silently | Task 10 |
| Light/dark toggle | Tasks 11, 12 |
| Font size ≥15px | Task 12 |
| GitHub Pages deploy | Task 13 |
| MIT license | Task 13 |
| `.superpowers/` in .gitignore | Task 1 |

No gaps found.

**Type consistency check:** All tasks use `DrawingOp`, `PatternConfig`, `PaperSize`, `PatternType`, `InkDensity` as defined in Task 3. `buildPdf` signature `(ops: DrawingOp[], paperSize: PaperSize, pageCount: number) => Promise<Blob>` is consistent throughout. `generatePattern(config: PatternConfig): DrawingOp[]` is consistent throughout.
