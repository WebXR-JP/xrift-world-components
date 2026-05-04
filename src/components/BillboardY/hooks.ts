import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
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
const SENTINEL_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
})

const applyBillboardRotation = (target: Object3D, camera: Camera) => {
  _cameraWorldPos.setFromMatrixPosition(camera.matrixWorld)
  _targetWorldPos.setFromMatrixPosition(target.matrixWorld)

  const worldRotationY = getBillboardYRotation(
    _cameraWorldPos,
    _targetWorldPos,
  )

  if (target.parent) {
    target.parent.matrixWorld.decompose(_parentPos, _parentQuat, _parentScale)
    _euler.setFromQuaternion(_parentQuat, 'YXZ')
    target.rotation.y = worldRotationY - _euler.y
  } else {
    target.rotation.y = worldRotationY
  }
}

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けてY軸のみ回転させる。
 * 親のワールド回転を考慮し、ローカル回転として正しい値を設定する。
 *
 * 二段構え:
 * 1. useFrame: メインカメラに向けて rotation を設定（renderer.render の前に1回）
 * 2. sentinel mesh: 各 render コールの onBeforeRender で再計算
 *    （Mirror のネステッドレンダー時に virtualCamera 向きへ更新）
 *
 * sentinel は単一・save/restore なしのシンプル構造。
 * 複数 BillboardY が同居しても各 sentinel は自分の target しか更新しないので
 * 干渉しない。
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  // メインカメラ向きでフレームごとに rotation を確定
  useFrame(({ camera }) => {
    if (!ref.current) return
    applyBillboardRotation(ref.current, camera)
  })

  // 各 render コール時に rotation を再計算（Mirror のネステッドレンダー対応）
  useEffect(() => {
    if (!ref.current) return
    const target = ref.current

    const sentinel = new Mesh(SENTINEL_GEOMETRY, SENTINEL_MATERIAL)
    sentinel.frustumCulled = false
    sentinel.renderOrder = -Infinity
    sentinel.layers.enableAll()
    sentinel.onBeforeRender = (_r, _s, camera: Camera) => {
      applyBillboardRotation(target, camera)
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
