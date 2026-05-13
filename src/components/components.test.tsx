import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SeedDisplay } from './SeedDisplay'
import { SettingsPanel } from './SettingsPanel'
import { SmartModeLock } from './SmartModeLock'

const mockSeed = new Uint8Array(32).fill(1)

describe('SeedDisplay', () => {
  it('renders a hex string', () => {
    render(<SeedDisplay seed={mockSeed} onRegenerate={() => {}} />)
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
    expect(screen.getAllByText(/v2/i).length).toBeGreaterThan(0)
  })
})
