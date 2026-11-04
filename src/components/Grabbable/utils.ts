import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { Position3D, Rotation3D } from '../../types/movement'

/** GrabSystem が扱う姿勢（位置・Euler回転・均一スケール） */
export interface WorldTransform {
  position: Position3D
  rotation: Rotation3D
  scale: number
}

/**
 * ワールド行列を GrabSystem 向けの姿勢（位置・Euler回転・均一スケール）に分解する。
 * <Grabbable> のルート group の matrixWorld を渡すと、変形された親の下にあっても
 * 正しいワールド姿勢が得られる（getTransform 用）。
 */
export function decomposeWorldTransform(matrixWorld: Matrix4): WorldTransform {
  const position = new Vector3()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  matrixWorld.decompose(position, quaternion, scale)
  const euler = new Euler().setFromQuaternion(quaternion)
  return {
    position: { x: position.x, y: position.y, z: position.z },
    rotation: { x: euler.x, y: euler.y, z: euler.z },
    scale: scale.x,
  }
}

/**
 * ワールド姿勢（位置＋Euler回転）を、親のワールド行列に対するローカル姿勢へ変換する。
 * GrabSystem はワールド座標で確定位置を返すため、変形された親を持つ <Grabbable> でも
 * ユーザーの onMove にはローカル座標（transform prop と同じ空間）を渡せる（onMove 用）。
 *
 * 親が無変形（単位行列）ならワールド＝ローカルなので、そのまま返るのと同じ結果になる。
 */
export function worldToLocalTransform(
  worldPosition: Position3D,
  worldRotation: Rotation3D,
  parentMatrixWorld: Matrix4,
): { position: Position3D; rotation: Rotation3D } {
  const position = new Vector3(worldPosition.x, worldPosition.y, worldPosition.z)
  const quaternion = new Quaternion().setFromEuler(
    new Euler(worldRotation.x, worldRotation.y, worldRotation.z),
  )
  const worldMatrix = new Matrix4().compose(position, quaternion, new Vector3(1, 1, 1))
  const localMatrix = new Matrix4().copy(parentMatrixWorld).invert().multiply(worldMatrix)

  const localPosition = new Vector3()
  const localQuaternion = new Quaternion()
  const localScale = new Vector3()
  localMatrix.decompose(localPosition, localQuaternion, localScale)
  const localEuler = new Euler().setFromQuaternion(localQuaternion)

  return {
    position: { x: localPosition.x, y: localPosition.y, z: localPosition.z },
    rotation: { x: localEuler.x, y: localEuler.y, z: localEuler.z },
  }
}

/** どちらの姿勢を当てるか（ワールドの transform prop か、プラットフォームが共有している位置か） */
export type PoseSource = 'transform' | 'synced'

/**
 * 当てる姿勢を、あとから変わったほうに決める。
 * - 共有している位置が変わった（誰かが離した）→ 共有している位置
 * - transform prop の値が変わった（ワールドが初期位置に戻した・onMove で丸めた）→ transform
 * - 両方変わった（初回・onMove で state にも入れているワールドが離した直後）→ 共有している位置
 * - どちらも変わっていない → 前回のまま
 * 共有している位置が無ければ常に transform
 */
export function nextPoseSource(
  previous: PoseSource,
  hasSynced: boolean,
  syncedChanged: boolean,
  transformChanged: boolean,
): PoseSource {
  if (!hasSynced) return 'transform'
  if (syncedChanged) return 'synced'
  if (transformChanged) return 'transform'
  return previous
}

/** transform prop の値の比較用キー（毎レンダー新しいオブジェクトで渡されても、値が同じなら同じ） */
export function poseKey(pose: { position: Position3D; rotation: Rotation3D }): string {
  const { position: p, rotation: r } = pose
  return `${p.x},${p.y},${p.z},${r.x},${r.y},${r.z}`
}
