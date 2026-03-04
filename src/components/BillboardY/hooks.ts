import { useEffect, useRef } from 'react'
import {
  BoxGeometry,
  Euler,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Quaternion,
  type Camera,
  Vector3,
} from 'three'
import { getBillboardYRotation } from './utils'

const _cameraWorldPos = new Vector3()
const _targetWorldPos = new Vector3()
const _parentQuat = new Quaternion()
const _euler = new Euler()

const SENTINEL_GEOMETRY = new BoxGeometry(0.001, 0.001, 0.001)
const SENTINEL_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
})

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けてY軸のみ回転させる
 * 親のワールド回転を考慮し、ローカル回転として正しい値を設定する
 *
 * sentinel Mesh の onBeforeRender を使用することで、
 * Mirror（Reflector）の virtualCamera でも正しい回転が適用される
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return

    const target = ref.current

    const sentinel = new Mesh(SENTINEL_GEOMETRY, SENTINEL_MATERIAL)
    sentinel.frustumCulled = false
    sentinel.renderOrder = -Infinity

    sentinel.onBeforeRender = (
      _renderer: unknown,
      _scene: unknown,
      camera: Camera,
    ) => {
      camera.getWorldPosition(_cameraWorldPos)
      target.getWorldPosition(_targetWorldPos)

      const worldRotationY = getBillboardYRotation(
        _cameraWorldPos,
        _targetWorldPos,
      )

      if (target.parent) {
        target.parent.getWorldQuaternion(_parentQuat)
        _euler.setFromQuaternion(_parentQuat, 'YXZ')
        target.rotation.y = worldRotationY - _euler.y
      } else {
        target.rotation.y = worldRotationY
      }

      target.updateWorldMatrix(false, true)
    }

    target.add(sentinel)

    return () => {
      sentinel.onBeforeRender = () => {}
      target.remove(sentinel)
    }
  }, [])

  return ref
}
