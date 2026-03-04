import { useEffect, useRef } from 'react'
import {
  BoxGeometry,
  type Camera,
  Euler,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { getBillboardYRotation } from './utils'

const _cameraWorldPos = new Vector3()
const _targetWorldPos = new Vector3()
const _parentQuat = new Quaternion()
const _parentPos = new Vector3()
const _parentScale = new Vector3()
const _euler = new Euler()

const SENTINEL_GEOMETRY = new BoxGeometry(0.001, 0.001, 0.001)

// Three.js はレンダーリストを opaque → transparent の順で処理する。
// renderOrder はリスト内のソートにのみ影響するため、
// opaque/transparent 両方の子要素に対応するには両方のリストに sentinel が必要。
const OPAQUE_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
})
const TRANSPARENT_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
  transparent: true,
  opacity: 0,
})

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けてY軸のみ回転させる
 * 親のワールド回転を考慮し、ローカル回転として正しい値を設定する
 *
 * 2つの sentinel メッシュ（pre/post）により、Mirror（Reflector）の
 * ネステッドレンダーと WebXR の両方に対応する。
 * - pre-sentinel (renderOrder=-Infinity): 回転を保存 → カメラ用に設定
 * - post-sentinel (renderOrder=+Infinity): 保存した回転を復元
 * スタック構造で多重ネスト（Mirror + WebXR左右眼）にも対応。
 *
 * WebXR安全性:
 * - setFromMatrixPosition(): matrixWorldを直接読み取り、updateWorldMatrixを呼ばない
 * - decompose(): 同上
 * - target.updateWorldMatrix(false, true): targetとその子のみ更新、カメラには触れない
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return
    const target = ref.current

    // 回転の save/restore 用スタック
    const savedRotations: number[] = []

    const applyRotation = (camera: Camera) => {
      savedRotations.push(target.rotation.y)

      // WebXR安全: matrixWorldを直接読み取り、updateWorldMatrixを呼ばない
      _cameraWorldPos.setFromMatrixPosition(camera.matrixWorld)
      _targetWorldPos.setFromMatrixPosition(target.matrixWorld)

      const worldRotationY = getBillboardYRotation(
        _cameraWorldPos,
        _targetWorldPos,
      )

      if (target.parent) {
        target.parent.matrixWorld.decompose(
          _parentPos,
          _parentQuat,
          _parentScale,
        )
        _euler.setFromQuaternion(_parentQuat, 'YXZ')
        target.rotation.y = worldRotationY - _euler.y
      } else {
        target.rotation.y = worldRotationY
      }

      target.updateWorldMatrix(false, true)
    }

    const restoreRotation = () => {
      const saved = savedRotations.pop()
      if (saved !== undefined) {
        target.rotation.y = saved
        target.updateWorldMatrix(false, true)
      }
    }

    // opaque リスト用 sentinel
    const opaquePreSentinel = new Mesh(SENTINEL_GEOMETRY, OPAQUE_MATERIAL)
    opaquePreSentinel.frustumCulled = false
    opaquePreSentinel.renderOrder = -Infinity
    opaquePreSentinel.onBeforeRender = (
      _r: unknown,
      _s: unknown,
      camera: Camera,
    ) => applyRotation(camera)

    const opaquePostSentinel = new Mesh(SENTINEL_GEOMETRY, OPAQUE_MATERIAL)
    opaquePostSentinel.frustumCulled = false
    opaquePostSentinel.renderOrder = Infinity
    opaquePostSentinel.onBeforeRender = restoreRotation

    // transparent リスト用 sentinel
    const transparentPreSentinel = new Mesh(
      SENTINEL_GEOMETRY,
      TRANSPARENT_MATERIAL,
    )
    transparentPreSentinel.frustumCulled = false
    transparentPreSentinel.renderOrder = -Infinity
    transparentPreSentinel.onBeforeRender = (
      _r: unknown,
      _s: unknown,
      camera: Camera,
    ) => applyRotation(camera)

    const transparentPostSentinel = new Mesh(
      SENTINEL_GEOMETRY,
      TRANSPARENT_MATERIAL,
    )
    transparentPostSentinel.frustumCulled = false
    transparentPostSentinel.renderOrder = Infinity
    transparentPostSentinel.onBeforeRender = restoreRotation

    const sentinels = [
      opaquePreSentinel,
      opaquePostSentinel,
      transparentPreSentinel,
      transparentPostSentinel,
    ]
    for (const s of sentinels) target.add(s)

    return () => {
      for (const s of sentinels) {
        s.onBeforeRender = () => {}
        target.remove(s)
      }
    }
  }, [])

  return ref
}
