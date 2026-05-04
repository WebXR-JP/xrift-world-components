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
 * 2. sentinel mesh × 2: 各 render コールの onBeforeRender で再計算
 *    - opaque list 用 sentinel: opaque パス開始時に rotation 更新
 *    - transparent list 用 sentinel: transparent パス開始時に rotation 更新
 *    両方必要なのは Mirror（Reflector）のネステッドレンダーで rotation が
 *    virtualCamera 向きに書き換わったあと、main render の transparent パスで
 *    描画される文字・黒背景なども正しい向きにするため。
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

    const onBeforeRender = (
      _r: unknown,
      _s: unknown,
      camera: Camera,
    ) => {
      applyBillboardRotation(target, camera)
      target.updateWorldMatrix(false, true)
    }

    const opaqueSentinel = new Mesh(SENTINEL_GEOMETRY, OPAQUE_MATERIAL)
    opaqueSentinel.frustumCulled = false
    opaqueSentinel.renderOrder = -Infinity
    opaqueSentinel.layers.enableAll()
    opaqueSentinel.onBeforeRender = onBeforeRender

    const transparentSentinel = new Mesh(SENTINEL_GEOMETRY, TRANSPARENT_MATERIAL)
    transparentSentinel.frustumCulled = false
    transparentSentinel.renderOrder = -Infinity
    transparentSentinel.layers.enableAll()
    transparentSentinel.onBeforeRender = onBeforeRender

    target.add(opaqueSentinel)
    target.add(transparentSentinel)

    return () => {
      opaqueSentinel.onBeforeRender = () => {}
      transparentSentinel.onBeforeRender = () => {}
      target.remove(opaqueSentinel)
      target.remove(transparentSentinel)
    }
  }, [])

  return ref
}
