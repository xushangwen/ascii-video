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
        <canvas
          ref={ref}
          // canvas 尺寸由 useAsciiRenderer 动态设置，CSS 不做额外缩放
          style={{ display: 'block' }}
        />
      </div>
    )
  }
)
