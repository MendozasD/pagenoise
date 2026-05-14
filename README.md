# PageNoise

Generate cryptographically-seeded noise patterns to print over sensitive documents before recycling. No server. No uploads. Everything runs in your browser.

**Live:** [pagenoise.davidmendoza.ch](https://pagenoise.davidmendoza.ch)

## What it does

PageNoise generates obfuscation PDFs you print on top of documents containing personal data before putting them in the recycling bin — no shredder required.

Four patterns: character rain, stipple, cross-hatch, and glitch bars. Each pattern is seeded with a cryptographically random value so no two outputs are identical.

## Use

1. Open the app
2. Choose a pattern, paper size, and ink density
3. Click **Generate** — PDF downloads instantly
4. Print it and lay it over the document before recycling

Not sure if a pattern covers well enough? Download the **test sheet** first and run a print test.

## Stack

- React 19 + TypeScript 6 + Vite 8
- [pdf-lib](https://pdf-lib.js.org/) for client-side PDF generation
- Web Crypto API for seed generation
- Zero backend, zero analytics

## Local dev

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
npm test
```

## License

MIT
