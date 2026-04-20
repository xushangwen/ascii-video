'use client'
import React from 'react'
import { AsciiParams, CHARSETS, ColorMode } from '@/lib/asciiEngine'

interface Props {
  params: AsciiParams
  onChange: (p: Partial<AsciiParams>) => void
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[11px] tracking-widest text-neutral-500 uppercase mb-2">{children}</p>
}

function Slider({
  label, value, min, max, step = 1, onChange
}: {
  label: string, value: number, min: number, max: number, step?: number,
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState('')

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
  }

  function commitEdit() {
    const n = Number(draft)
    if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)))
    setEditing(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(false)
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] tracking-widest text-neutral-500 uppercase">{label}</span>
        {editing ? (
          <input
            autoFocus
            type="number"
            value={draft}
            min={min}
            max={max}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKey}
            className="w-12 bg-transparent border-b border-neutral-900 text-[11px] font-mono text-neutral-900
              text-right focus:outline-none [appearance:textfield]
              [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-[11px] font-mono text-neutral-600 hover:text-neutral-900 hover:underline underline-offset-2 tabular-nums"
          >
            {value}
          </button>
        )}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  )
}

function Toggle({ label, value, onChange }: {
  label: string, value: boolean, onChange: (v: boolean) => void
}) {
  return (
    <div className="flex justify-between items-center mb-3">
      <span className="text-[11px] tracking-widest text-neutral-500 uppercase">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-colors relative ${value ? 'bg-neutral-900' : 'bg-neutral-300'}`}
      >
        <span className={`absolute top-[2px] w-3 h-3 rounded-full bg-white transition-all ${value ? 'left-[18px]' : 'left-[2px]'}`} />
      </button>
    </div>
  )
}

function CustomCharInput({ onApply }: { onApply: (v: string) => void }) {
  const [value, setValue] = React.useState('')

  function apply() {
    if (value.trim()) { onApply(value.trim()); setValue('') }
  }

  return (
    <div className="flex gap-1">
      <input
        type="text"
        value={value}
        placeholder="Custom chars..."
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') apply() }}
        className="flex-1 min-w-0 bg-transparent border border-neutral-300 px-2 py-1.5 text-[11px] font-mono
          text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-neutral-500"
      />
      <button
        onClick={apply}
        className="px-2 py-1.5 text-[11px] border border-neutral-300 text-neutral-500
          hover:border-neutral-900 hover:text-neutral-900 transition-colors shrink-0"
      >
        <i className="ri-check-line" />
      </button>
    </div>
  )
}

// 选中态用 ring（box-shadow）而非 border，避免被父容器 overflow 裁切
function ChipBtn({
  selected, onClick, children
}: {
  selected: boolean, onClick: () => void, children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`py-1.5 px-2 text-[12px] tracking-wider uppercase border transition-all
        ${selected
          ? 'border-neutral-900 text-neutral-900 bg-black/5 shadow-[0_0_0_1px_#111]'
          : 'border-neutral-300 text-neutral-400 hover:border-neutral-500 hover:text-neutral-700'}`}
    >
      {children}
    </button>
  )
}

function ColorSwatch({ label, value, onChange }: {
  label: string, value: string, onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] tracking-widest text-neutral-500 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-neutral-400">{value}</span>
        <label className="relative cursor-pointer">
          <div
            className="w-6 h-6 border border-neutral-300 hover:border-neutral-500 transition-colors"
            style={{ background: value }}
          />
          <input
            type="color" value={value} onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  )
}

const BG_GRAY  = ['#000000', '#2d2d2d', '#5a5a5a', '#888888', '#b5b5b5', '#e0e0e0', '#ffffff']
const BG_COLOR = ['#fdf6e3', '#fff0f0', '#fce8ff', '#e8f0ff', '#e8fff2', '#0d1117', '#1a1a2e']

const FG_PRESETS = ['#ffffff', '#cccccc', '#00ff88', '#ff6b35', '#4fc3f7', '#ffd700', '#ff4ede']

export function ControlsPanel({ params, onChange }: Props) {
  const charsetKeys = Object.keys(CHARSETS)

  return (
    <div className="h-full flex flex-col text-neutral-900 overflow-y-auto scrollbar-none">

      {/* 字符集 */}
      <div className="mb-5">
        <SectionLabel>Character Set</SectionLabel>
        {/* p-px 给按钮 border 留空间，防止被父容器裁切 */}
        <div className="grid grid-cols-2 gap-1 mb-1 p-px">
          {charsetKeys.map(key => (
            <ChipBtn
              key={key}
              selected={params.charset === CHARSETS[key]}
              onClick={() => onChange({ charset: CHARSETS[key] })}
            >
              {key}
            </ChipBtn>
          ))}
        </div>
        <CustomCharInput onApply={v => onChange({ charset: v })} />
      </div>

      <div className="border-t border-neutral-200 mb-4" />

      {/* 参数滑块 */}
      <Slider label="Resolution" value={params.cols} min={20} max={220} onChange={v => onChange({ cols: v })} />
      <Slider label="FPS" value={params.fps} min={1} max={60} onChange={v => onChange({ fps: v })} />
      <Slider label="Brightness" value={params.brightness} min={-100} max={100} onChange={v => onChange({ brightness: v })} />
      <Slider label="Contrast" value={params.contrast} min={-128} max={128} onChange={v => onChange({ contrast: v })} />

      <div className="border-t border-neutral-200 mb-4" />

      <Toggle label="Invert" value={params.invert} onChange={v => onChange({ invert: v })} />

      <div className="border-t border-neutral-200 mb-4" />

      {/* 颜色模式 — Segmented Control，grid 三等分避免溢出 */}
      <SectionLabel>Color Mode</SectionLabel>
      <div className="grid grid-cols-3 mb-4">
        {(['bw', 'color', 'single'] as ColorMode[]).map((mode, i) => (
          <button
            key={mode}
            onClick={() => onChange({ colorMode: mode })}
            className={`relative py-1.5 text-[11px] uppercase text-center border transition-all
              ${i > 0 ? '-ml-px' : ''}
              ${params.colorMode === mode
                ? 'bg-neutral-900 text-white border-neutral-900 z-10'
                : 'border-neutral-300 text-neutral-400 hover:text-neutral-700 hover:border-neutral-500 hover:z-10'}`}
          >
            {mode === 'bw' ? 'B&W' : mode === 'color' ? 'Color' : 'Custom'}
          </button>
        ))}
      </div>

      {/* 前景色（Custom 模式） */}
      {params.colorMode === 'single' && (
        <div className="mb-4">
          <ColorSwatch label="Foreground" value={params.fgColor} onChange={v => onChange({ fgColor: v })} />
          <div className="flex flex-wrap gap-1 mt-1 p-px">
            {FG_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ fgColor: c })}
                title={c}
                className="w-5 h-5 border border-neutral-300 hover:border-neutral-500 transition-colors"
                style={{ background: c, ...(params.fgColor === c ? { outline: '1px solid #999', outlineOffset: '1.5px' } : {}) }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-neutral-200 mb-4" />

      {/* 背景色 */}
      <ColorSwatch label="Background" value={params.bgColor} onChange={v => onChange({ bgColor: v })} />
      <div className="flex flex-wrap gap-1 mb-1.5 p-[3px]">
        {BG_GRAY.map(c => (
          <button
            key={c}
            onClick={() => onChange({ bgColor: c })}
            title={c}
            className="w-5 h-5 border border-neutral-300 hover:border-neutral-500 transition-colors"
            style={{ background: c, ...(params.bgColor === c ? { outline: '1px solid #999', outlineOffset: '1.5px' } : {}) }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mb-4 p-[3px]">
        {BG_COLOR.map(c => (
          <button
            key={c}
            onClick={() => onChange({ bgColor: c })}
            title={c}
            className="w-5 h-5 border border-neutral-300 hover:border-neutral-500 transition-colors"
            style={{ background: c, ...(params.bgColor === c ? { outline: '1px solid #999', outlineOffset: '1.5px' } : {}) }}
          />
        ))}
      </div>

    </div>
  )
}
