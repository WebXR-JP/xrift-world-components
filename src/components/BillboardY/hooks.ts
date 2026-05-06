import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Euler,
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

/** カメラとターゲットの水平距離がこれ以下なら rotation 更新をスキップ。
 * カメラの真上/真下にターゲットがあるケースで atan2 が数値的に不安定になり
 * rotation が暴れるのを防ぐ（例: 自分の頭上に出す TagDisplay や NameTag）。 */
const MIN_HORIZONTAL_DIST_SQ = 0.0001 // (0.01m)²

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けて Y 軸のみ回転させる。
 * 親のワールド回転を考慮し、ローカル回転として正しい値を設定する。
 *
 * 実装方針:
 * - useFrame で renderer.render() の前に rotation を確定する
 * - 1 フレーム中に複数の renderer.render 呼び出しがあっても全て同じ matrixWorld
 *   を使うので、複数 BillboardY 同居や opaque/transparent 混在でも安定して動作する
 *
 * 既知の制約:
 * - Mirror（Reflector）の鏡像内では billboard が「鏡カメラに向く」挙動はしない
 *   （メインカメラ向きで固定される）。鏡像内でも正しい向きにしたいケースは
 *   別途検討が必要（issue #173 参照）。
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  useFrame(({ camera }) => {
    const target = ref.current
    if (!target) return

    _cameraWorldPos.setFromMatrixPosition(camera.matrixWorld)
    _targetWorldPos.setFromMatrixPosition(target.matrixWorld)

    const dx = _cameraWorldPos.x - _targetWorldPos.x
    const dz = _cameraWorldPos.z - _targetWorldPos.z

    // カメラの真上/真下に target があるとき atan2 が暴れるのでスキップ
    if (dx * dx + dz * dz < MIN_HORIZONTAL_DIST_SQ) return

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
  })

  return ref
}
