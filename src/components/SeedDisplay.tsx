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
