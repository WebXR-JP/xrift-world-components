import { capturePointer } from './capturePointer'
import { useCallback, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { actionButtonStyle, type ActionButtonType } from './styles'
import { BUTTON_SIZE } from './constants'

interface Props {
  type: ActionButtonType
  label: ReactNode
  onPress: () => void
  onRelease?: () => void
  /** false の間は灰色にして押せなくする */
  enabled?: boolean
  /** false の間は場所だけ取って見えなく・触れなくする（ほかのボタンの位置がずれないように。本番と同じ） */
  visible?: boolean
}

/** スマホの丸いボタン（本番の ActionButton と同じ見た目）。押している間だけ pressed になる */
export function ActionButton({ type, label, onPress, onRelease, enabled = true, visible = true }: Props) {
  const [pressed, setPressed] = useState(false)
  // 押しているかは ref で持ち、離した処理は一度だけ呼ぶ（setState の更新関数の中で呼ぶと二度走りうる）
  const pressedRef = useRef(false)

  const handleDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!enabled) return
      capturePointer(event.currentTarget, event.pointerId)
      pressedRef.current = true
      setPressed(true)
      onPress()
    },
    [enabled, onPress],
  )
  const handleUp = useCallback(() => {
    if (!pressedRef.current) return
    pressedRef.current = false
    setPressed(false)
    onRelease?.()
  }, [onRelease])

  return (
    <button
      type="button"
      aria-hidden={!visible}
      style={actionButtonStyle(type, BUTTON_SIZE, { pressed, enabled, visible })}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onLostPointerCapture={handleUp}
      onPointerLeave={handleUp}
    >
      {label}
    </button>
  )
}
