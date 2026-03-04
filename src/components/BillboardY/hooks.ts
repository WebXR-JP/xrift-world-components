import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Euler, type Object3D, Quaternion, Vector3 } from 'three'
import { getBillboardYRotation } from './utils'

const _cameraWorldPos = new Vector3()
const _targetWorldPos = new Vector3()
const _parentQuat = new Quaternion()
const _euler = new Euler()

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けてY軸のみ回転させる
 * 親のワールド回転を考慮し、ローカル回転として正しい値を設定する
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  useFrame((state) => {
    if (!ref.current) return
    state.camera.getWorldPosition(_cameraWorldPos)
    ref.current.getWorldPosition(_targetWorldPos)

    const worldRotationY = getBillboardYRotation(
      _cameraWorldPos,
      _targetWorldPos,
    )

    if (ref.current.parent) {
      ref.current.parent.getWorldQuaternion(_parentQuat)
      _euler.setFromQuaternion(_parentQuat, 'YXZ')
      ref.current.rotation.y = worldRotationY - _euler.y
    } else {
      ref.current.rotation.y = worldRotationY
    }
  })

  return ref
}
