'use client'
import React from 'react'
import { AsciiParams, CHARSETS, ColorMode } from '@/lib/asciiEngine'

interface Props {
  params: AsciiParams
  onChange: (p: Partial<AsciiParams>) => void
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[11px] tracking-widest text-neutral-400 uppercase mb-2">{children}</p>
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
        <span className="text-[11px] tracking-widest text-neutral-400 uppercase">{label}</span>
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
            className="w-12 bg-transparent border-b border-white text-[11px] font-mono text-white
              text-right focus:outline-none [appearance:textfield]
              [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        ) : (
          <button
            onClick={startEdit}
            className="text-[11px] font-mono text-neutral-300 hover:text-white hover:underline underline-offset-2 tabular-nums"
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
      <span className="text-[11px] tracking-widest text-neutral-400 uppercase">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-8 h-4 rounded-full transition-colors relative ${value ? 'bg-white' : 'bg-neutral-700'}`}
      >
        <span className={`absolute top-[2px] w-3 h-3 rounded-full bg-black transition-all ${value ? 'left-[18px]' : 'left-[2px]'}`} />
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
          ? 'border-white text-white bg-white/10 shadow-[0_0_0_1px_white]'
          : 'border-neutral-700 text-neutral-500 hover:border-neutral-400 hover:text-neutral-300'}`}
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
      <span className="text-[11px] tracking-widest text-neutral-400 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-neutral-500">{value}</span>
        <label className="relative cursor-pointer">
          <div
            className="w-6 h-6 border border-neutral-600 hover:border-neutral-300 transition-colors"
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

const BG_PRESETS = [
  '#000000', '#111111', '#1c1c1c', '#2a2a2a',
  '#ffffff', '#f0f0f0', '#e8e8e8',
  '#050510', '#0a0a20', '#0d1117',
  '#0a1a0a', '#1a0a0a', '#1a0a14', '#0a141a',
]

const FG_PRESETS = ['#ffffff', '#cccccc', '#00ff88', '#ff6b35', '#4fc3f7', '#ffd700', '#ff4ede']

export function ControlsPanel({ params, onChange }: Props) {
  const charsetKeys = Object.keys(CHARSETS)

  return (
    <div className="h-full flex flex-col text-white overflow-y-auto scrollbar-none">

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
        <input
          type="text"
          placeholder="Custom chars..."
          className="w-full bg-transparent border border-neutral-700 px-2 py-1.5 text-[11px] font-mono
            text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-neutral-400"
          onBlur={e => { if (e.target.value) onChange({ charset: e.target.value }) }}
        />
      </div>

      <div className="border-t border-neutral-800 mb-4" />

      {/* 参数滑块 */}
      <Slider label="Resolution" value={params.cols} min={20} max={220} onChange={v => onChange({ cols: v })} />
      <Slider label="FPS" value={params.fps} min={1} max={60} onChange={v => onChange({ fps: v })} />
      <Slider label="Brightness" value={params.brightness} min={-100} max={100} onChange={v => onChange({ brightness: v })} />
      <Slider label="Contrast" value={params.contrast} min={-128} max={128} onChange={v => onChange({ contrast: v })} />

      <div className="border-t border-neutral-800 mb-4" />

      <Toggle label="Invert" value={params.invert} onChange={v => onChange({ invert: v })} />

      <div className="border-t border-neutral-800 mb-4" />

      {/* 颜色模式 */}
      <SectionLabel>Color Mode</SectionLabel>
      <div className="flex gap-1 mb-4 p-px">
        {(['bw', 'color', 'single'] as ColorMode[]).map(mode => (
          <ChipBtn
            key={mode}
            selected={params.colorMode === mode}
            onClick={() => onChange({ colorMode: mode })}
          >
            {mode === 'bw' ? 'B&W' : mode === 'color' ? 'Color' : 'Custom'}
          </ChipBtn>
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
                className={`w-5 h-5 border transition-all ${params.fgColor === c ? 'border-white shadow-[0_0_0_1px_white]' : 'border-neutral-700 hover:border-neutral-400'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-neutral-800 mb-4" />

      {/* 背景色 */}
      <ColorSwatch label="Background" value={params.bgColor} onChange={v => onChange({ bgColor: v })} />
      <div className="flex flex-wrap gap-1 mb-4 p-px">
        {BG_PRESETS.map(c => (
          <button
            key={c}
            onClick={() => onChange({ bgColor: c })}
            title={c}
            className={`w-5 h-5 border transition-all ${params.bgColor === c ? 'border-white shadow-[0_0_0_1px_white]' : 'border-neutral-700 hover:border-neutral-400'}`}
            style={{ background: c }}
          />
        ))}
      </div>

    </div>
  )
}
