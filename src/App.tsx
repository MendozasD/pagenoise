import { useState, useCallback } from 'react'
import { generateSeed, seedToHex } from './engines/crypto-seed'
import { generatePattern } from './engines/pattern'
import { buildPdf } from './engines/pdf-builder'
import { buildTestSheet } from './engines/test-sheet'
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
      downloadBlob(blob, `pagenoise-${seedToHex(seed).slice(0, 8)}-${pageCount}p.pdf`)
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
      downloadBlob(blob, `pagenoise-test-sheet-${paperSize}.pdf`)
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
            <h1 className="app-title">PageNoise</h1>
            <p className="app-subtitle">Print noise. Stay private.</p>
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
        <a href="https://github.com/MendozasD/pagenoise" target="_blank" rel="noopener noreferrer">Open source on GitHub ↗</a>
      </footer>
    </div>
  )
}
