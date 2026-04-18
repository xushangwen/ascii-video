'use client'
import { forwardRef } from 'react'

interface Props {
  bgColor: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const AsciiSvg = forwardRef<SVGSVGElement, Props>(
  function AsciiSvg({ bgColor, containerRef }, ref) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ background: bgColor }}
      >
        {/* SVG 由 useAsciiRenderer 直接操作 innerHTML，React 不管理其子节点 */}
        <svg ref={ref} style={{ display: 'block', flexShrink: 0 }} />
      </div>
    )
  }
)
