import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type Object3D, Vector3 } from 'three'
import { getBillboardYRotation } from './utils'

const _cameraWorldPos = new Vector3()
const _targetWorldPos = new Vector3()

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けてY軸のみ回転させる
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  useFrame((state) => {
    if (!ref.current) return
    state.camera.getWorldPosition(_cameraWorldPos)
    ref.current.getWorldPosition(_targetWorldPos)
    ref.current.rotation.y = getBillboardYRotation(
      _cameraWorldPos,
      _targetWorldPos,
    )
  })

  return ref
}
