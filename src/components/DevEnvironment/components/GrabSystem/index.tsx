import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useSyncExternalStore } from 'react'
import { Raycaster, Vector2 } from 'three'
import type { Group } from 'three'
import { LAYERS } from '../../../../constants/layers'
import {
  GRAB_KEY,
  MAX_HOLD_DISTANCE,
  RAYCAST_FRAME_INTERVAL,
  WHEEL_DISTANCE_STEP,
} from './constants'
import { applyGrabGhostAppearance } from './ghostAppearance'
import type { DevGrabStore } from './store'
import { computeHeldPosition, findFirstGrabbableId } from './utils'

interface Props {
  store: DevGrabStore
}

const NDC_CENTER = new Vector2(0, 0)

/**
 * 中央クロスヘアから掴める対象（GRABBABLE レイヤー）を狙うレイキャスター
 */
function GrabRaycaster({ store }: Props) {
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const raycasterRef = useRef(new Raycaster())
  const frameCountRef = useRef(0)

  useFrame(() => {
    // 掴み中・ポインターロックなし → ホバーなし
    if (store.getState().phase !== 'idle' || !document.pointerLockElement) {
      store.setHovered(null)
      return
    }

    // パフォーマンス: 一定フレームに1回だけレイキャスト
    frameCountRef.current++
    if (frameCountRef.current % RAYCAST_FRAME_INTERVAL !== 0) return

    const raycaster = raycasterRef.current
    raycaster.layers.set(LAYERS.GRABBABLE)
    raycaster.far = MAX_HOLD_DISTANCE
    raycaster.setFromCamera(NDC_CENTER, camera)

    const intersects = raycaster.intersectObjects(scene.children, true)
    store.setHovered(findFirstGrabbableId(intersects))
  })

  return null
}

/**
 * 掴む/離す/距離調整/キャンセルの入力を処理する
 * - G: 狙っている対象を掴む / 掴み中なら確定して離す
 * - クリック: 掴み中なら確定して離す
 * - ホイール: 保持距離を増減（上スクロールで遠ざける）
 * - Esc（ポインターロック解除）: キャンセル（元位置）
 */
function GrabInputHandler({ store }: Props) {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const grabOrRelease = () => {
      const state = store.getState()
      if (state.phase === 'holding') {
        store.release()
        return
      }
      if (!document.pointerLockElement) return
      if (!state.hoveredId) return
      store.grab(state.hoveredId, camera.position)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key !== GRAB_KEY && e.key !== GRAB_KEY.toUpperCase()) return
      e.preventDefault()
      grabOrRelease()
    }

    // クリックでの確定（ロック取得のためのクリックを誤検出しないよう mousedown 時のロック状態を見る）
    let wasLockedOnMouseDown = false
    const handleMouseDown = () => {
      wasLockedOnMouseDown = !!document.pointerLockElement
    }
    const handleClick = () => {
      if (store.getState().phase !== 'holding') return
      if (!wasLockedOnMouseDown) return
      store.release()
    }

    const handleWheel = (e: WheelEvent) => {
      if (store.getState().phase !== 'holding') return
      e.preventDefault()
      // 上スクロール（deltaY<0）で遠ざける
      const delta = e.deltaY < 0 ? WHEEL_DISTANCE_STEP : -WHEEL_DISTANCE_STEP
      store.adjustHoldDistance(delta)
    }

    // Esc 等でポインターロックが外れたらキャンセル（元位置のまま）
    const handlePointerLockChange = () => {
      if (document.pointerLockElement) return
      store.cancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('click', handleClick)
    window.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('wheel', handleWheel)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
    }
  }, [store, camera])

  return null
}

/**
 * 掴んでいる対象を視点前方に浮かせて表示するゴースト（半透明）
 * 掴んだ時点の回転・スケールを維持し、位置だけ毎フレーム更新する
 * 位置は確定用に heldPosition としてストアへ書き込む
 */
function GrabbedObjectGhost({ store }: Props) {
  const groupRef = useRef<Group>(null)
  const camera = useThree((s) => s.camera)
  const grabbedId = useSyncExternalStore(store.subscribe, () => store.getState().grabbedId)

  const entry = grabbedId ? store.getEntry(grabbedId) : undefined

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    const { phase, holdDistance, heldRotation, heldScale } = store.getState()
    if (phase !== 'holding') {
      group.visible = false
      return
    }

    const position = computeHeldPosition(camera.position, camera.quaternion, holdDistance)
    group.position.set(position.x, position.y, position.z)
    group.rotation.set(heldRotation.x, heldRotation.y, heldRotation.z)
    group.scale.setScalar(heldScale)
    group.visible = true

    store.updateHeldPosition(position)
    applyGrabGhostAppearance(group)
  })

  if (!grabbedId || !entry) return null

  return (
    <group ref={groupRef} visible={false}>
      <Suspense fallback={null}>{entry.renderGhost()}</Suspense>
    </group>
  )
}

/**
 * DevEnvironment 用のローカル掴みシステム
 * <Grabbable> で囲まれた対象を中央クロスヘアで狙って掴み、視点前方に浮かせて運ぶ
 * （本番プラットフォームの GrabSystem と同じ操作感を開発プレビューで再現する）
 */
export function GrabSystem({ store }: Props) {
  return (
    <>
      <GrabRaycaster store={store} />
      <GrabbedObjectGhost store={store} />
      <GrabInputHandler store={store} />
    </>
  )
}
