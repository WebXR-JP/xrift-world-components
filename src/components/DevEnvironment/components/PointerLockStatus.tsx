import type { CSSProperties } from 'react'

interface Props {
  isLocked: boolean
}

const containerStyle: CSSProperties = {
  position: 'absolute',
  top: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1001,
  pointerEvents: 'none',
}

const statusBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 12,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: 500,
}

const kbdStyle: CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 3,
  fontFamily: 'monospace',
  fontSize: 11,
  fontWeight: 'bold',
  margin: '0 2px',
}

const lockedStyle: CSSProperties = {
  background: 'rgba(34, 197, 94, 0.25)',
  color: '#22c55e',
  borderColor: 'rgba(34, 197, 94, 0.3)',
}

const unlockedStyle: CSSProperties = {
  background: 'rgba(249, 115, 22, 0.25)',
  color: '#f97316',
  borderColor: 'rgba(249, 115, 22, 0.3)',
}

export function PointerLockStatus({ isLocked }: Props) {
  return (
    <div style={containerStyle}>
      <div
        style={{
          ...statusBase,
          ...(isLocked ? lockedStyle : unlockedStyle),
        }}
      >
        <span style={{ fontSize: 14 }}>
          {isLocked ? '\u{1F512}' : '\u{1F5B1}\uFE0F'}
        </span>
        <span>
          {isLocked ? (
            <>
              マウスロック中 - <kbd style={kbdStyle}>ESC</kbd>で解除
            </>
          ) : (
            '画面をクリックしてマウスロック開始'
          )}
        </span>
      </div>
    </div>
  )
}
