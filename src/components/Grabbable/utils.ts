import { Euler, Matrix4, type Object3D, Quaternion, Vector3 } from 'three'
import { LAYERS } from '../../constants/layers'
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
  const localMatrix = toParentLocal(
    new Matrix4().compose(position, quaternion, new Vector3(1, 1, 1)),
    parentMatrixWorld,
  )

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

const _parentInverse = new Matrix4()

/**
 * ワールド行列を、親のワールド行列から見たローカル行列に直す（matrix を書き換えて返す）。
 * worldToLocalTransform（離した位置）と applyWorldPose（持っている間）で同じ変換を使う
 */
function toParentLocal(matrix: Matrix4, parentMatrixWorld: Matrix4): Matrix4 {
  return matrix.premultiply(_parentInverse.copy(parentMatrixWorld).invert())
}

const _worldMatrix = new Matrix4()
const _position = new Vector3()
const _quaternion = new Quaternion()
const _scale = new Vector3()

/**
 * ワールド姿勢（位置・クォータニオン・均一スケール）を object に当てる。
 * 親が変形されていても、親から見たローカルに直して当てるのでワールドでその姿勢になる。
 * 持っている間に毎フレーム呼ばれるので、作業用の行列は使い回す
 */
export function applyWorldPose(
  object: Object3D,
  position: Position3D,
  quaternion: { x: number; y: number; z: number; w: number },
  scale: number,
): void {
  _position.set(position.x, position.y, position.z)
  _quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
  _scale.setScalar(scale)
  _worldMatrix.compose(_position, _quaternion, _scale)
  const parent = object.parent
  if (parent) {
    parent.updateWorldMatrix(true, false)
    toParentLocal(_worldMatrix, parent.matrixWorld)
  }
  _worldMatrix.decompose(object.position, object.quaternion, object.scale)
}

/** 持っているのは誰か（持ち上げた・離したの判定に使う） */
export type Holder = 'none' | 'mine' | 'other'

/**
 * 持ち主の変化から、呼ぶハンドラーを順に返す。
 * 持ち主が自分⇄ほかの人に入れ替わったときは、離してから持ち上げたことにする
 */
export function holdTransitions(
  previous: Holder,
  next: Holder,
): Array<{ type: 'grab' | 'release'; isMine: boolean }> {
  if (previous === next) return []
  const events: Array<{ type: 'grab' | 'release'; isMine: boolean }> = []
  if (previous !== 'none') events.push({ type: 'release', isMine: previous === 'mine' })
  if (next !== 'none') events.push({ type: 'grab', isMine: next === 'mine' })
  return events
}

/** 持っている間に INTERACTABLE を外した子に付ける印（離したらこの印の子だけ戻す） */
const STRIPPED_INTERACTABLE_KEY = '__xriftGrabStrippedInteractable'

/**
 * 持っている間の本体から GRABBABLE・INTERACTABLE を外す（自分で掴み直したり押したりしないように）。
 * INTERACTABLE は <Interactable> が付けたものなので、外した子には印を付けておき、離したら戻す。
 * 子を覚えておかないので、持っている間に消えた子を離すまで抱え込まない
 */
export function stripHeldLayers(group: Object3D): void {
  group.traverse((obj) => {
    obj.layers.disable(LAYERS.GRABBABLE)
    if (!obj.layers.isEnabled(LAYERS.INTERACTABLE)) return
    obj.layers.disable(LAYERS.INTERACTABLE)
    obj.userData[STRIPPED_INTERACTABLE_KEY] = true
  })
}

/**
 * stripHeldLayers で外したレイヤーを戻す。
 * GRABBABLE は掴める（enabled）ときだけ戻し、INTERACTABLE は印の付いた子だけ戻す
 */
export function restoreHeldLayers(group: Object3D, isGrabbable: boolean): void {
  group.traverse((obj) => {
    if (isGrabbable) obj.layers.enable(LAYERS.GRABBABLE)
    if (!obj.userData[STRIPPED_INTERACTABLE_KEY]) return
    obj.layers.enable(LAYERS.INTERACTABLE)
    delete obj.userData[STRIPPED_INTERACTABLE_KEY]
  })
}

/**
 * 持っている間にレイヤーを外し直す間隔（フレーム）。持ち始めの 1 回目は必ず外し、
 * あとは遅れてマウントされた子のためにときどき外し直す（毎フレーム全部をなぞらない）
 */
export const STRIP_LAYERS_INTERVAL = 30

/** 持ち始めから数えて何フレーム目なら外し直すか */
export function shouldStripLayers(heldFrame: number): boolean {
  return heldFrame % STRIP_LAYERS_INTERVAL === 0
}
