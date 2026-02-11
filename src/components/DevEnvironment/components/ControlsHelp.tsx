import type { CSSProperties, ReactNode } from 'react'

const containerStyle: CSSProperties = {
  position: 'absolute',
  bottom: 16,
  left: 16,
  padding: '10px 14px',
  background: 'rgba(0, 0, 0, 0.55)',
  color: '#fff',
  borderRadius: 8,
  fontSize: 12,
  lineHeight: 1.7,
  pointerEvents: 'none',
  userSelect: 'none',
  fontFamily: 'system-ui, sans-serif',
  backdropFilter: 'blur(4px)',
}

const kbdStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  background: 'rgba(255, 255, 255, 0.15)',
  borderRadius: 3,
  fontSize: 11,
  fontFamily: 'inherit',
  marginRight: 2,
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd style={kbdStyle}>{children}</kbd>
}

export function ControlsHelp() {
  return (
    <div style={containerStyle}>
      <div>
        <Kbd>Click</Kbd> ロック開始 / インタラクト
      </div>
      <div>
        <Kbd>W</Kbd>
        <Kbd>A</Kbd>
        <Kbd>S</Kbd>
        <Kbd>D</Kbd> 移動
      </div>
      <div>
        <Kbd>Space</Kbd>
        <Kbd>E</Kbd> ジャンプ
      </div>
    </div>
  )
}
