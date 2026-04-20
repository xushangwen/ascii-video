'use client'
import { useEffect, useRef } from 'react'

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `
  precision mediump float;
  uniform float u_time;
  uniform vec2  u_res;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    vec2 p  = uv * 2.0 - 1.0;
    p.x *= u_res.x / u_res.y;

    float r = length(p);
    float a = atan(p.y, p.x);

    // 中心螺旋扭曲
    float twist = 4.2 * exp(-r * 1.3);
    float sa = a + twist - u_time * 0.16;

    vec2 sq = vec2(cos(sa), sin(sa)) * r * 0.5 + 0.5;

    // 半调网格
    float scale = 21.0;
    vec2  cell  = fract(sq * scale) - 0.5;
    float d     = length(cell);

    // 涟漪调制点半径
    float ripple = sin(r * 7.5 - u_time * 0.38) * 0.5 + 0.5;
    float dotR   = 0.16 + ripple * 0.22;

    // 中心淡出 + 边缘淡出
    float fade = smoothstep(0.07, 0.38, r) * smoothstep(1.65, 0.95, r);

    float dot = smoothstep(dotR + 0.04, dotR - 0.04, d) * fade;

    vec3 bg  = vec3(0.980, 0.980, 0.980);
    vec3 fg  = vec3(0.830, 0.830, 0.830);

    gl_FragColor = vec4(mix(bg, fg, dot), 1.0);
  }
`

export function HalftoneSwirl() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl')
    if (!gl) return

    function compile(type: number, src: string) {
      const s = gl!.createShader(type)!
      gl!.shaderSource(s, src)
      gl!.compileShader(s)
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uRes  = gl.getUniformLocation(prog, 'u_res')

    function resize() {
      const dpr = devicePixelRatio || 1
      canvas!.width  = canvas!.clientWidth  * dpr
      canvas!.height = canvas!.clientHeight * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const start = performance.now()
    let raf: number

    function render() {
      const t = (performance.now() - start) / 1000
      gl!.uniform1f(uTime, t)
      gl!.uniform2f(uRes, canvas!.width, canvas!.height)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" />
}
