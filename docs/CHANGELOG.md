# Changelog

All notable changes to PageNoise are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### Added
- 2026-05-13: Full v1 implementation — browser-only React app (Vite + TypeScript) that generates cryptographically-seeded obfuscation pattern PDFs for printing over sensitive documents before recycling
- 2026-05-13: Four pattern generators: Character Rain (char ops), Stipple (dot ops), Cross-Hatch (line ops), Glitch Bars (rect ops) — all TDD with Vitest
- 2026-05-13: Web Crypto API CSPRNG seed engine with hex serialisation (generateSeed, seedToHex, hexToSeed)
- 2026-05-13: pdf-lib PDF builder with correct Y-axis flip (top-left → bottom-left origin conversion)
- 2026-05-13: Test sheet generator — realistic sensitive document layout (personal info, financial data, dense text, table) for empirical coverage testing
- 2026-05-13: Four UI components: SeedDisplay (hex + copy + regenerate), SettingsPanel (pages, paper size, pattern, ink density), PreviewPanel (live SVG), SmartModeLock (v2 placeholder — no logic)
- 2026-05-13: Light/dark mode toggle, font size ≥15px, responsive 2-column layout
- 2026-05-13: GitHub Pages deploy config (base: './', .nojekyll), MIT license
- 2026-05-13: Smart Mode gated for v2 — Tesseract.js WASM OCR must clear ≥90% bounding box coverage threshold before unlocking
- 2026-05-14: Renamed project to PageNoise — package.json, page title, app heading, download filenames, README, footer GitHub link
- 2026-05-14: Published to GitHub (MendozasD/pagenoise) and deployed to Cloudflare Workers (static assets)
- 2026-05-14: Added wrangler.jsonc (Cloudflare auto-config PR merged) + @cloudflare/vite-plugin; deploy command: npx wrangler deploy
- 2026-05-14: Fixed asset base path: './' → '/' for root-domain deployment
- 2026-05-14: Added .node-version (22) — CF Pages defaults to Node 18 which breaks Vite 8
- 2026-05-14: Removed @rolldown/binding-darwin-arm64 — macOS-only workaround, breaks Linux CF build
- 2026-05-14: Custom domain pagenoise.davidmendoza.ch live — provisioned via Workers domains API
