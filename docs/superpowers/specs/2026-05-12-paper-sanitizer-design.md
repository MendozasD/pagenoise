# Paper Sanitizer — Design Spec
**Date:** 2026-05-12
**Status:** Approved for implementation

---

## Problem

Sensitive printed documents (bank statements, medical records, contracts) accumulate before recycling. Shredding is noisy, slow, and produces unrecyclable confetti. This tool offers an eco-friendly alternative: print a cryptographically-seeded obfuscation pattern directly over the sensitive text, rendering it unreadable to human eyes and OCR scanners, while keeping the paper intact and recyclable.

---

## Audience

| Audience | Primary need | Secondary need |
|---|---|---|
| DIY / eco-conscious | Notebook-making from recycled paper, zero trust in cloud tools | Low friction, beautiful UI |
| Enterprise | Auditable document destruction at scale, compliance | Repeatable artifacts, batch output |

---

## Workflow — Two modes, one gate

### Blind Mode (v1 — ships at launch)
1. User sets: page count, paper size, pattern type, ink density
2. App generates a cryptographic seed via Web Crypto API
3. Pattern Engine produces drawing instructions from seed + settings
4. SVG preview updates live
5. User clicks Generate → PDF Builder renders PDF → browser downloads it
6. User prints PDF, feeds sensitive pages back through printer

### Smart Mode (v2 — gated)
- Unlocks only after Tesseract.js WASM clears a coverage threshold test: ≥90% of identified text bounding boxes receive ink coverage on a standard 10-document test set (typed A4 pages, mixed font sizes 8–14pt, black on white)
- User uploads scan/photo of existing page — processed entirely client-side, never leaves the browser
- OCR produces text bounding boxes → Pattern Engine weights density over text regions
- Output: targeted PDF where ink lands precisely on text, not blank margins
- UI shows a locked placeholder card from day one to set the product narrative

---

## Architecture

Three isolated layers. No backend. No network calls. Zero data leaves the browser.

```
UI Layer (React + Vite)
  └── Pattern Engine (pure TypeScript — no React dependency)
        └── PDF Builder (pdf-lib wrapper)
```

### Layer responsibilities

**Pattern Engine** (`src/engines/pattern.ts`)
- Pure functions: `(config: PatternConfig) => DrawingOp[]`
- Input: seed (Uint8Array), page size, pattern type, ink density
- Output: array of drawing operations (no DOM, no pdf-lib dependency)
- Unit-testable in isolation; deterministic from seed
- Framework-agnostic: same module works in CLI or Tauri with zero changes

**PDF Builder** (`src/engines/pdf-builder.ts`)
- Wraps pdf-lib
- Input: DrawingOp[], page dimensions
- Output: PDF Blob → handed to browser for download
- One page per call; caller loops for multi-page jobs

**Crypto Seed** (`src/engines/crypto-seed.ts`)
- `generateSeed(): Uint8Array` — calls `crypto.getRandomValues(new Uint8Array(32))`
- `seedToHex(seed: Uint8Array): string` — for display and copy
- `hexToSeed(hex: string): Uint8Array` — for reproducibility from saved seed

**UI Layer** — React components orchestrate user input → engines → download

---

## File Structure

```
src/
  engines/
    pattern.ts          # Pure pattern generation
    pdf-builder.ts      # pdf-lib wrapper
    crypto-seed.ts      # Web Crypto seed utilities
  components/
    SettingsPanel.tsx   # Page count, size, pattern, density
    SeedDisplay.tsx     # Hex seed, copy button, regenerate button
    PreviewPanel.tsx    # Live SVG preview of current pattern
    SmartModeLock.tsx   # v2 placeholder — no dead code
  App.tsx
  main.tsx
```

---

## Pattern Types (all four ship at v1)

| Pattern | Mechanism | Ink use | OCR resistance |
|---|---|---|---|
| Character Rain | Grid of random printable ASCII/Unicode chars, varied size and rotation | Medium | Very high — OCR sees garbage |
| Stipple | CSPRNG-placed dots at configurable density | Low | Moderate — depends on density |
| Cross-Hatch | Two diagonal line families at pseudo-random angles and spacing | Medium | High — breaks text runs |
| Glitch Bars | Horizontal bars of varying gray levels, widths, and offsets | Medium-high | Very high — line-level coverage |

All patterns are seeded from the same Uint8Array. Same seed + same settings = identical output, always.

---

## Settings (per job)

| Setting | Type | Range / Options |
|---|---|---|
| Page count | Number input | 1–50 |
| Paper size | Select | A4 (default), Letter, A5 |
| Pattern type | Select | Character Rain, Stipple, Cross-Hatch, Glitch Bars |
| Ink density | Segmented control | Low / Medium / High |
| Seed | Text display + actions | Auto-generated; copy to clipboard; manual regenerate |

---

## Test Sheet

The app includes a built-in **Test Sheet** generator alongside the main tool:
- Prints a reference page containing: full name + address block, IBAN + account number, Swiss/EU ID number format, two dense paragraphs (10pt), a table with 3 columns of personal data, and a signature line — covering the most common sensitive document layouts
- User prints test sheet first, runs it back through the printer with each pattern type
- Provides empirical coverage data before committing to a pattern for real documents
- The digital SVG preview approximates coverage but physical print is the ground truth

---

## Output

- Generate button → `pdf-lib` builds PDF → `URL.createObjectURL(blob)` → programmatic `<a>` click → browser downloads
- Filename: `sanitizer-{seed-prefix}-{page-count}p.pdf`
- Object URL revoked after 60 seconds to avoid memory leak
- Multi-page jobs: single PDF, one page per sheet

---

## Error Handling

| Scenario | Handling |
|---|---|
| pdf-lib throws | try/catch in PDF Builder; user-facing toast: "PDF generation failed — try regenerating the seed" |
| Invalid page count | Clamp silently to 1–50 range |
| Low-confidence OCR (Smart Mode v2) | Flag regions visually before generating; user must confirm |

---

## Deployment

- GitHub repository (open source, MIT license)
- GitHub Pages or Vercel — one command deploy
- No environment variables, no secrets, no backend
- `.superpowers/` added to `.gitignore`

---

## Future / Explicitly Out of Scope for v1

| Item | Decision |
|---|---|
| Smart Mode (OCR-targeted) | v2, gated on Tesseract.js quality validation |
| CLI companion | v2, same Pattern Engine module, no rewrite needed |
| Tauri desktop wrapper | v2, same engines, UI unchanged |
| Tutorial (print + bookbinding) | Separate docs page, post-v1 |
| Physical fragment reconstruction | Out of scope — noted in UI copy |
| Server-side processing | Never — privacy non-negotiable |
