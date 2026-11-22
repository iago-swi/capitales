import { mapFrame } from './mapFrame'
import type { Location, Mode } from './scoring'

type Props = {
  frame: ReturnType<typeof mapFrame>; mode: Mode; revealed: boolean
  guess?: Location; label: string; onDrop: (position: Location) => void
}
export function CountryMap({frame,mode,revealed,guess,label,onDrop}: Props) {
  const point = frame.projection(frame.capital)!
  const pin = guess && frame.projection(guess)
  const placing = mode === 'place' && !revealed
  return <svg className="country-map" viewBox="0 0 800 480" role="img" aria-label={label}
    style={{touchAction: placing ? 'none' : undefined, cursor: placing ? 'crosshair' : undefined}}
    onPointerDown={event=>{
      if (!placing || !event.isPrimary || event.button !== 0) return
      const matrix = event.currentTarget.getScreenCTM()
      if (!matrix) return
      const p = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse())
      if (p.x<0 || p.x>800 || p.y<0 || p.y>480) return
      event.preventDefault()
      onDrop(frame.projection.invert!([p.x,p.y])!)
    }}>
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.7" />
        </pattern>
        <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="800" height="480" className="map-grid" fill="url(#grid)" />
      <path d={frame.outline} className="country-shape" />
      {mode==='place' && revealed && <path d={frame.ring} fill="none" stroke="#f36662" strokeWidth="3" strokeDasharray="7 5"/>}
      {pin && <g stroke="#15374a" strokeWidth="3">
        <line x1={pin[0]} y1={pin[1]} x2={point[0]} y2={point[1]} strokeDasharray="6 4"/>
        <circle cx={pin[0]} cy={pin[1]} r="7" fill="white"/>
      </g>}
      {!placing && <g><circle cx={point[0]} cy={point[1]} r="17" className="capital-pulse"/>
        <circle cx={point[0]} cy={point[1]} r="6" className="capital-dot" filter="url(#glow)"/></g>}
    </svg>
}
