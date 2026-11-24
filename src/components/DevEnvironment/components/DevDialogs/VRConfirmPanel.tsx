import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useXR, useXRInputSourceState } from '@react-three/xr'
import { Container, Text } from '@react-three/uikit'
import { Quaternion, Vector3, type Group } from 'three'
import { useDefaultFont } from '../../../../hooks/useDefaultFont'
import { XR_BUTTON } from '../DevXR/constants'
import type { DevDialogStore } from './store'

interface Props {
  store: DevDialogStore
}

/** 頭からパネルまでの距離[m]（本番の VRConfirmDialog と同じ） */
const PANEL_DISTANCE = 1.5
/** パネルの幅[m] */
const PANEL_SIZE_X = 1.5
/** 目線から少し下げる[m] */
const PANEL_Y_OFFSET = -0.1

const _offset = new Vector3()
const _headPosition = new Vector3()
const _headQuaternion = new Quaternion()

/**
 * useConfirm() の確認画面（VR）。本番の VRConfirmDialog と同じく、目の前に浮かせてレイで押す。
 * 右コントローラーの B でキャンセル
 */
export function VRConfirmPanel({ store }: Props) {
  const session = useXR((s) => s.session)
  const request = useSyncExternalStore(store.subscribe, () => store.getState().confirm, () => null)
  const camera = useThree((s) => s.camera)
  const right = useXRInputSourceState('controller', 'right')
  const fontFamilies = useDefaultFont(['ja'])
  const groupRef = useRef<Group>(null)
  const bPressedRef = useRef(false)

  const handleCancel = useCallback(() => store.answerConfirm(false), [store])
  const handleConfirm = useCallback(() => store.answerConfirm(true), [store])

  useFrame(() => {
    const group = groupRef.current
    if (!group || !request) return
    camera.getWorldPosition(_headPosition)
    camera.getWorldQuaternion(_headQuaternion)
    _offset.set(0, PANEL_Y_OFFSET, -PANEL_DISTANCE).applyQuaternion(_headQuaternion)
    group.position.copy(_headPosition).add(_offset)
    group.quaternion.copy(_headQuaternion)

    // 右コントローラーの B でキャンセル（押した瞬間だけ）
    const pressed = right?.inputSource.gamepad?.buttons[XR_BUTTON.SECONDARY]?.pressed ?? false
    if (pressed && !bPressedRef.current) store.answerConfirm(false)
    bPressedRef.current = pressed
  })

  if (!session || !request) return null
  return (
    <group ref={groupRef}>
      <Container
        sizeX={PANEL_SIZE_X}
        padding={12}
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        gap={8}
        fontFamilies={fontFamilies}
      >
        <Container positionType="absolute" width="100%" height="100%" backgroundColor="#1a1a2e" borderRadius={12} />
        <Text fontSize={5} fontFamily="ja" fontWeight="bold" color="#ffffff">
          {request.title}
        </Text>
        <Text fontSize={4} fontFamily="ja" color="#cccccc">
          {request.message}
        </Text>
        <Container flexDirection="row" gap={8} justifyContent="center">
          <Container
            padding={6}
            paddingX={14}
            backgroundColor="#555555"
            borderRadius={4}
            borderWidth={1}
            borderColor="#888888"
            hover={{ backgroundColor: '#777777' }}
            onClick={handleCancel}
            cursor="pointer"
          >
            <Text fontSize={4} fontFamily="ja" color="#ffffff">
              {request.cancelLabel}
            </Text>
          </Container>
          <Container
            padding={6}
            paddingX={14}
            backgroundColor="#4a90d9"
            borderRadius={4}
            borderWidth={1}
            borderColor="#6bb0f0"
            hover={{ backgroundColor: '#5aa0e9' }}
            onClick={handleConfirm}
            cursor="pointer"
          >
            <Text fontSize={4} fontFamily="ja" color="#ffffff">
              {request.confirmLabel}
            </Text>
          </Container>
        </Container>
      </Container>
    </group>
  )
}
