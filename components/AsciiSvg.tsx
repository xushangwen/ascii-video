'use client'
import { forwardRef } from 'react'

interface Props {
  bgColor: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const AsciiCanvas = forwardRef<HTMLCanvasElement, Props>(
  function AsciiCanvas({ bgColor, containerRef }, ref) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ background: bgColor }}
      >
        {/* Canvas 由 useAsciiRenderer 直接绘制，React 不管理其内容 */}
        <canvas ref={ref} style={{ display: 'block', flexShrink: 0 }} />
      </div>
    )
  }
)
