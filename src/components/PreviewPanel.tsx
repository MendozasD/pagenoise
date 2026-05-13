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
