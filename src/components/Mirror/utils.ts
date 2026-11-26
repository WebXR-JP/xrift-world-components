import type { Camera, Layers, Matrix4, PerspectiveCamera } from 'three'
import { Quaternion, Vector3 } from 'three'
import { LAYERS } from '../../constants/layers'

/**
 * カメラ距離に応じて Reflector を使うべきかを判定する。
 * ヒステリシスにより境界付近でのチラつきを防止する。
 *
 * - 現在 Reflector 表示中 → distance > lodDistance で envMap に切り替え
 * - 現在 envMap 表示中 → distance <= lodDistance * hysteresisRatio で Reflector に戻る
 */
export function shouldUseReflector(
  distance: number,
  lodDistance: number,
  currentlyUsingReflector: boolean,
  hysteresisRatio: number,
): boolean {
  if (currentlyUsingReflector) return distance <= lodDistance
  return distance <= lodDistance * hysteresisRatio
}

/**
 * 鏡のリフレクションカメラ用に、レイヤーを三人称視点の構成にする。
 *
 * リフレクションカメラはメインカメラの clone なので、一人称の構成
 * （FIRST_PERSON_ONLY 有効・THIRD_PERSON_ONLY 無効）を継承している。
 * そのままだと鏡には頭部なしコピーが映るため、FIRST_PERSON_ONLY を無効化し
 * THIRD_PERSON_ONLY を有効化する。それ以外のレイヤーは継承したまま触らない。
 *
 * layers.enableAll() を使ってはいけない。頭部なしコピー（9層）と頭部込みの全身（10層）は
 * 同じ位置にぴったり重なっているため、両方が描画されると自分のアバターを2回描くことになる。
 * 半透明部分が二重に合成されて濃く映り、どちらが前面に出るかも描画順に依存してしまう。
 */
export function applyThirdPersonLayers(layers: Layers): void {
  layers.disable(LAYERS.FIRST_PERSON_ONLY)
  layers.enable(LAYERS.THIRD_PERSON_ONLY)
}

/** 反射カメラの near の下限[m]（目が鏡面にほぼ接したときに 0 にならないようにする） */
const MIN_REFLECTION_NEAR = 0.01

const _mirrorPosition = new Vector3()
const _mirrorQuaternion = new Quaternion()
const _mirrorScale = new Vector3()
const _mirrorNormal = new Vector3()
const _eye = new Vector3()
const _corner = new Vector3()
/** 鏡の +Z（表）の向きを、カメラの視線（-Z）に合わせるための半回転 */
const _halfTurn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI)
const CORNER_SIGNS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const

/**
 * 反射カメラを、鏡の枠にぴったり合う視錐台にする。
 *
 * 見ている目を鏡面で折り返した位置にカメラを置き、鏡と同じ向き（裏から表を見る向き）にして、
 * 鏡の四隅を通る非対称の視錐台を張る。鏡に映る景色は「折り返した目から鏡の枠を窓として
 * 見た景色」と同じなので、枠の外は描かなくてよい。near を鏡面に置くので、鏡より裏にある物は
 * 映らない。
 *
 * 描いた絵は鏡面のローカル XY にそのまま対応する（裏から見るので左右だけ逆）。
 *
 * @param width 鏡面の幅（ローカル座標）
 * @param height 鏡面の高さ（ローカル座標）
 * @returns 目が鏡の裏にあって映す必要がないとき false
 */
export function fitReflectionCamera(
  reflectionCamera: PerspectiveCamera,
  viewer: Camera,
  mirrorMatrixWorld: Matrix4,
  width: number,
  height: number,
): boolean {
  mirrorMatrixWorld.decompose(_mirrorPosition, _mirrorQuaternion, _mirrorScale)
  _mirrorNormal.set(0, 0, 1).applyQuaternion(_mirrorQuaternion)
  _eye.setFromMatrixPosition(viewer.matrixWorld)

  const distance = _corner.subVectors(_eye, _mirrorPosition).dot(_mirrorNormal)
  if (distance <= 0) return false

  reflectionCamera.position.copy(_eye).addScaledVector(_mirrorNormal, -2 * distance)
  reflectionCamera.quaternion.copy(_mirrorQuaternion).multiply(_halfTurn)
  reflectionCamera.updateMatrixWorld()

  // カメラから見た鏡の四隅の範囲。鏡面はカメラの正面 distance の位置にある
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.POSITIVE_INFINITY
  let top = Number.NEGATIVE_INFINITY
  for (const [signX, signY] of CORNER_SIGNS) {
    _corner
      .set((signX * width) / 2, (signY * height) / 2, 0)
      .applyMatrix4(mirrorMatrixWorld)
      .applyMatrix4(reflectionCamera.matrixWorldInverse)
    left = Math.min(left, _corner.x)
    right = Math.max(right, _corner.x)
    bottom = Math.min(bottom, _corner.y)
    top = Math.max(top, _corner.y)
  }

  const viewerFar = (viewer as PerspectiveCamera).far
  const near = Math.max(distance, MIN_REFLECTION_NEAR)
  const far = Math.max(viewerFar, near * 2)
  // 四隅の範囲は鏡面（distance）での値なので、near での値に直す
  const scale = near / distance
  reflectionCamera.near = near
  reflectionCamera.far = far // WebGLBackground が参照する
  reflectionCamera.projectionMatrix.makePerspective(
    left * scale,
    right * scale,
    top * scale,
    bottom * scale,
    near,
    far,
    viewer.coordinateSystem,
    viewer.reversedDepth === true,
  )
  reflectionCamera.projectionMatrixInverse.copy(reflectionCamera.projectionMatrix).invert()
  return true
}
