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
const _cameraForward = new Vector3()
const _virtualCameraPos = new Vector3()
const _parentQuat = new Quaternion()
const _parentPos = new Vector3()
const _parentScale = new Vector3()
const _euler = new Euler()

/** カメラとターゲットが水平方向にこれ以下に近接していたら「仮想カメラ位置」へ
 * フォールバックする閾値。0.1m = 10cm。
 *
 * 自分の頭上に置く NameTag / TagDisplay のように XZ 座標がカメラと一致するケースで
 * atan2(0, 0) が暴れるのを防ぐ。歩行時の frame ラグ（〜25mm/frame）や
 * 走行時のラグ（〜83mm/frame）もこの範囲に収まる。 */
const NEAR_CAMERA_DIST_SQ = 0.01 // (0.1m)²

/** 仮想カメラを実カメラの視線方向何メートル先に置くか */
const VIRTUAL_CAMERA_DISTANCE = 1.0

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
 * カメラ真上/真下対応:
 * - target がカメラの真上/真下にあると atan2(0, 0) が暴れるため、水平距離が
 *   {@link NEAR_CAMERA_DIST_SQ} 以下のときは「カメラの視線方向 1m 先」を
 *   仮想カメラ位置として使い、そこから target を見ているとして rotation を計算する
 *   （視線方向に合わせて billboard が回転する形になる）
 * - 視線が真上/真下のときは forward の XZ 成分が無くなるので前フレームの rotation
 *   を保持する
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

    // 通常はカメラ実位置を使う
    let refPos: Vector3 = _cameraWorldPos

    const dx = _cameraWorldPos.x - _targetWorldPos.x
    const dz = _cameraWorldPos.z - _targetWorldPos.z
    if (dx * dx + dz * dz < NEAR_CAMERA_DIST_SQ) {
      // カメラが target の真上/真下付近 → 視線方向 1m 先を仮想カメラ位置に
      camera.getWorldDirection(_cameraForward)
      _cameraForward.y = 0
      const fwdLenSq =
        _cameraForward.x * _cameraForward.x +
        _cameraForward.z * _cameraForward.z
      if (fwdLenSq < NEAR_CAMERA_DIST_SQ) {
        // 視線が真上/真下 → 前フレームの rotation を保持
        return
      }
      _cameraForward.normalize()
      _virtualCameraPos
        .copy(_cameraWorldPos)
        .addScaledVector(_cameraForward, VIRTUAL_CAMERA_DISTANCE)
      refPos = _virtualCameraPos
    }

    const worldRotationY = getBillboardYRotation(refPos, _targetWorldPos)

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
