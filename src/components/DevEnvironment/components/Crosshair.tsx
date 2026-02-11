import type { CSSProperties } from 'react'
import {
  CROSSHAIR_SIZE,
  CROSSHAIR_THICKNESS,
  CROSSHAIR_ACTIVE_THICKNESS,
  HIGHLIGHT_COLOR,
} from '../constants'

interface Props {
  active: boolean
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  zIndex: 100,
  width: CROSSHAIR_SIZE,
  height: CROSSHAIR_SIZE,
}

const lineBase: CSSProperties = {
  position: 'absolute',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  transition:
    'background-color 0.2s ease, width 0.15s ease, height 0.15s ease, box-shadow 0.2s ease',
}

export function Crosshair({ active }: Props) {
  const color = active ? HIGHLIGHT_COLOR : 'rgba(255, 255, 255, 0.1)'
  const shadow = active ? `0 0 8px ${HIGHLIGHT_COLOR}` : 'none'

  return (
    <div style={containerStyle}>
      <div
        style={{
          ...lineBase,
          top: '50%',
          left: 0,
          width: '100%',
          height: active ? CROSSHAIR_ACTIVE_THICKNESS : CROSSHAIR_THICKNESS,
          transform: 'translateY(-50%)',
          backgroundColor: color,
          boxShadow: shadow,
        }}
      />
      <div
        style={{
          ...lineBase,
          top: 0,
          left: '50%',
          width: active ? CROSSHAIR_ACTIVE_THICKNESS : CROSSHAIR_THICKNESS,
          height: '100%',
          transform: 'translateX(-50%)',
          backgroundColor: color,
          boxShadow: shadow,
        }}
      />
    </div>
  )
}
