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
