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
