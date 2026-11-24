import type { CSSProperties } from 'react'

/** 本番（xrift-frontend の VirtualJoystick・JoystickControl・ActionButton）に合わせたスタイル */
export const containerStyle: CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  padding: 20,
  pointerEvents: 'none',
  zIndex: 1500,
  font: 'bold 12px system-ui, sans-serif',
}

export const buttonGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  pointerEvents: 'none',
}

export const joystickStyle = (size: number, active: boolean): CSSProperties => ({
  position: 'relative',
  width: size,
  height: size,
  background: active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
  border: `2px solid ${active ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
  boxShadow: active ? '0 0 20px rgba(255, 255, 255, 0.3)' : undefined,
  borderRadius: '50%',
  pointerEvents: 'all',
  touchAction: 'none',
  userSelect: 'none',
  transition: 'background 0.2s ease, border-color 0.2s ease',
})

export const knobStyle = (x: number, y: number): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '40%',
  height: '40%',
  background: 'rgba(255, 255, 255, 0.8)',
  borderRadius: '50%',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
})

export type ActionButtonType = 'jump' | 'interact' | 'grab'

const BUTTON_COLORS: Record<ActionButtonType, { normal: string; pressed: string; glow: string }> = {
  jump: { normal: 'rgba(255, 100, 100, 0.8)', pressed: 'rgba(255, 80, 80, 1)', glow: 'rgba(255, 100, 100, 0.5)' },
  interact: { normal: 'rgba(100, 200, 100, 0.8)', pressed: 'rgba(80, 180, 80, 1)', glow: 'rgba(100, 200, 100, 0.5)' },
  grab: { normal: 'rgba(96, 165, 250, 0.8)', pressed: 'rgba(70, 140, 235, 1)', glow: 'rgba(96, 165, 250, 0.5)' },
}

const FONT_SIZE: Record<ActionButtonType, number> = { jump: 12, interact: 9, grab: 10 }

export const actionButtonStyle = (
  type: ActionButtonType,
  size: number,
  { pressed, enabled, visible }: { pressed: boolean; enabled: boolean; visible: boolean },
): CSSProperties => {
  const colors = BUTTON_COLORS[type]
  return {
    width: size,
    height: size,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    color: 'white',
    fontWeight: 'bold',
    fontSize: FONT_SIZE[type],
    pointerEvents: visible ? 'all' : 'none',
    visibility: visible ? 'visible' : 'hidden',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    padding: 0,
    background: !enabled ? 'rgba(100, 100, 100, 0.5)' : pressed ? colors.pressed : colors.normal,
    opacity: enabled ? 1 : 0.5,
    transform: pressed ? 'scale(0.95)' : undefined,
    boxShadow: pressed ? `0 0 20px ${colors.glow}` : undefined,
  }
}
