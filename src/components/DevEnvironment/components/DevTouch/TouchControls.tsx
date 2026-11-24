import { useCallback, useSyncExternalStore } from 'react'
import type { MouseEvent, MutableRefObject } from 'react'
import type { DevVRInput } from '../DevXR/types'
import type { DevGrabStore } from '../GrabSystem/store'
import { ActionButton } from './ActionButton'
import { Joystick } from './Joystick'
import { buttonGroupStyle, containerStyle } from './styles'

interface Props {
  /** 移動・ジャンプの入力の書き込み先（PhysicsPlayer が毎フレーム読む） */
  inputRef: MutableRefObject<DevVRInput>
  grabStore: DevGrabStore
  /** 画面中央のクロスヘアが押せる物に当たっているか */
  isHit: boolean
  /** クロスヘアが当たっている物を押す */
  onInteract: () => void
  /** クロスヘアが狙っている物を掴む／持っている物を離す */
  onGrabToggle: () => void
}

/** ボタンのクリックが、クロスヘアのインタラクト（window の mousedown）に届かないようにする */
const stopPropagation = (event: MouseEvent) => event.stopPropagation()

/**
 * スマホの操作（本番の VirtualJoystick と同じ並び）。
 * 左下にジョイスティック、右下に上から「掴む／離す」「インタラクト（持っている間は使う）」「ジャンプ」
 */
export function TouchControls({ inputRef, grabStore, isHit, onInteract, onGrabToggle }: Props) {
  // getState は持っている物を動かすたびに新しいオブジェクトになるので、必要な値だけ取り出して比べる
  const isHolding = useSyncExternalStore(
    grabStore.subscribe,
    () => grabStore.getState().phase === 'holding' && grabStore.getState().vrHold === null,
    () => false,
  )
  const isHovering = useSyncExternalStore(
    grabStore.subscribe,
    () => grabStore.getState().hoveredId !== null,
    () => false,
  )
  const isGrabVisible = isHolding || isHovering

  const handleJumpPress = useCallback(() => {
    inputRef.current.jump = true
  }, [inputRef])
  const handleJumpRelease = useCallback(() => {
    inputRef.current.jump = false
  }, [inputRef])
  // 持っている間は「使う」（押す＝onUseStart・離す＝onUseEnd）、持っていなければインタラクト
  const handleInteractPress = useCallback(() => {
    if (grabStore.getState().phase === 'holding') {
      grabStore.useStart()
      return
    }
    onInteract()
  }, [grabStore, onInteract])
  const handleInteractRelease = useCallback(() => grabStore.useEnd(), [grabStore])

  return (
    <div style={containerStyle} onMouseDown={stopPropagation}>
      <Joystick inputRef={inputRef} />
      <div style={buttonGroupStyle}>
        <ActionButton
          type="grab"
          label={isHolding ? '離す' : '掴む'}
          visible={isGrabVisible}
          onPress={onGrabToggle}
        />
        <ActionButton
          type="interact"
          label={isHolding ? <span style={{ fontSize: 12 }}>使う</span> : 'インタラクト'}
          enabled={isHolding || isHit}
          onPress={handleInteractPress}
          onRelease={handleInteractRelease}
        />
        <ActionButton type="jump" label="ジャンプ" onPress={handleJumpPress} onRelease={handleJumpRelease} />
      </div>
    </div>
  )
}
