import type { Camera, Layers, PerspectiveCamera } from 'three'
import { Matrix4, Quaternion, Vector3 } from 'three'
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
 * 画面上の大きさから、反射を描くべきかを判定する。
 * ヒステリシスにより境界付近でのチラつきを防止する。
 *
 * - 現在 反射を表示中 → screenPixels < minPixels で擬似ミラーに切り替え
 * - 現在 擬似ミラーを表示中 → screenPixels >= minPixels * hysteresisRatio で反射に戻る
 *
 * @param screenPixels 鏡が画面に占める大きさ[px]（長いほうの辺）
 * @param hysteresisRatio 1 以上
 */
export function shouldUseReflectorBySize(
  screenPixels: number,
  minPixels: number,
  currentlyUsingReflector: boolean,
  hysteresisRatio: number,
): boolean {
  if (currentlyUsingReflector) return screenPixels >= minPixels
  return screenPixels >= minPixels * hysteresisRatio
}

/**
 * 反射の絵の 1 辺の大きさ[px]を決める。
 * 画面上の 1 画素に絵の 1 画素が当たれば十分なので、画面上の大きさまで下げる。
 * 上限はテクスチャの大きさ。
 *
 * 大きさは step 刻みに切り上げる。少し動いただけで大きさが変わると、絵の画素の格子が
 * 毎フレームずれて映りが揺らいで見える。
 *
 * @param screenPixels 画面上の大きさ[px]。有限でないときは上限を返す
 */
export function getReflectionTextureSize(
  screenPixels: number,
  textureSize: number,
  minSize: number,
  step: number,
): number {
  if (!Number.isFinite(screenPixels)) return textureSize
  const stepped = Math.ceil(screenPixels / step) * step
  return Math.min(textureSize, Math.max(minSize, stepped))
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
const _mirrorInverse = new Matrix4()
const _localEye = new Vector3()
const _localPoint = new Vector3()

/** 鏡面のローカル XY での矩形 */
export interface MirrorRect {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** 見えている範囲の外側に足す余白（範囲の辺に対する割合）。絵の端がにじまないようにする */
const VISIBLE_RECT_PADDING = 0.02

/**
 * 鏡面のうち、いま画面に見えている範囲を求める（鏡面のローカル XY）。
 *
 * 反射の絵はこの範囲だけを描けばよい。鏡に近づいて鏡の一部しか見えていないときに、
 * 見えていない部分へテクスチャの画素を使わずに済み、近づいても映りが粗くならない。
 *
 * 画面の四隅を通る視線が鏡の平面に当たる点を囲む範囲を、鏡の枠で切り取る。
 * 四隅の視線のどれかが鏡の平面に当たらない（鏡をほぼ真横から見ている・鏡に背を向けた
 * 隅がある）ときは範囲が閉じないので、鏡の全面を返す。
 *
 * @param out 結果の書き込み先
 */
export function getVisibleMirrorRect(
  out: MirrorRect,
  viewer: Camera,
  mirrorMatrixWorld: Matrix4,
  width: number,
  height: number,
): MirrorRect {
  out.minX = -width / 2
  out.maxX = width / 2
  out.minY = -height / 2
  out.maxY = height / 2

  _mirrorInverse.copy(mirrorMatrixWorld).invert()
  _localEye.setFromMatrixPosition(viewer.matrixWorld).applyMatrix4(_mirrorInverse)
  if (_localEye.z <= 0) return out

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const [signX, signY] of CORNER_SIGNS) {
    // 画面の隅を通る視線上の 1 点（鏡のローカル座標）
    _localPoint
      .set(signX, signY, 0.5)
      .applyMatrix4(viewer.projectionMatrixInverse)
      .applyMatrix4(viewer.matrixWorld)
      .applyMatrix4(_mirrorInverse)
    const dz = _localPoint.z - _localEye.z
    // 鏡の平面へ向かっていない視線がある
    if (dz >= -1e-6) return out
    const t = -_localEye.z / dz
    const x = _localEye.x + (_localPoint.x - _localEye.x) * t
    const y = _localEye.y + (_localPoint.y - _localEye.y) * t
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }

  const padX = (maxX - minX) * VISIBLE_RECT_PADDING
  const padY = (maxY - minY) * VISIBLE_RECT_PADDING
  minX = Math.max(minX - padX, out.minX)
  maxX = Math.min(maxX + padX, out.maxX)
  minY = Math.max(minY - padY, out.minY)
  maxY = Math.min(maxY + padY, out.maxY)
  // 鏡が画面に入っていない（描かれないはずだが、念のため全面のままにする）
  if (minX >= maxX || minY >= maxY) return out

  out.minX = minX
  out.maxX = maxX
  out.minY = minY
  out.maxY = maxY
  return out
}


/**
 * 反射カメラを、鏡面の矩形にぴったり合う視錐台にする。
 *
 * 見ている目を鏡面で折り返した位置にカメラを置き、鏡と同じ向き（裏から表を見る向き）にして、
 * 矩形の四隅を通る非対称の視錐台を張る。鏡に映る景色は「折り返した目から鏡の枠を窓として
 * 見た景色」と同じなので、枠の外は描かなくてよい。near を鏡面に置くので、鏡より裏にある物は
 * 映らない。
 *
 * 描いた絵は矩形にそのまま対応する（裏から見るので左右だけ逆）。
 *
 * @param rect 描く範囲（鏡面のローカル XY）。鏡の全面か、getVisibleMirrorRect の結果
 * @returns 目が鏡の裏にあって映す必要がないとき false
 */
export function fitReflectionCamera(
  reflectionCamera: PerspectiveCamera,
  viewer: Camera,
  mirrorMatrixWorld: Matrix4,
  rect: MirrorRect,
): boolean {
  mirrorMatrixWorld.decompose(_mirrorPosition, _mirrorQuaternion, _mirrorScale)
  _mirrorNormal.set(0, 0, 1).applyQuaternion(_mirrorQuaternion)
  _eye.setFromMatrixPosition(viewer.matrixWorld)

  const distance = _corner.subVectors(_eye, _mirrorPosition).dot(_mirrorNormal)
  if (distance <= 0) return false

  reflectionCamera.position.copy(_eye).addScaledVector(_mirrorNormal, -2 * distance)
  reflectionCamera.quaternion.copy(_mirrorQuaternion).multiply(_halfTurn)
  reflectionCamera.updateMatrixWorld()

  // カメラから見た矩形の四隅の範囲。鏡面はカメラの正面 distance の位置にある
  let left = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.POSITIVE_INFINITY
  let top = Number.NEGATIVE_INFINITY
  for (const [signX, signY] of CORNER_SIGNS) {
    _corner
      .set(signX < 0 ? rect.minX : rect.maxX, signY < 0 ? rect.minY : rect.maxY, 0)
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

/** 画面上の大きさ[px] */
export interface ScreenSize {
  width: number
  height: number
}

const _viewInverse = new Matrix4()
const _screenCorner = new Vector3()
const _screenNeighbor = new Vector3()
/** 隅での細かさを測るために、辺に沿って進む割合 */
const DENSITY_SAMPLE_RATIO = 0.01

/** 鏡面のローカル XY の点を画面の位置[px]に写す。カメラの後ろなら false */
function projectToScreen(
  out: Vector3,
  x: number,
  y: number,
  viewer: Camera,
  mirrorMatrixWorld: Matrix4,
  viewportWidth: number,
  viewportHeight: number,
): boolean {
  out.set(x, y, 0).applyMatrix4(mirrorMatrixWorld).applyMatrix4(_viewInverse)
  // カメラは -Z を向く
  if (out.z >= 0) return false
  out.applyMatrix4(viewer.projectionMatrix)
  out.x *= viewportWidth / 2
  out.y *= viewportHeight / 2
  return true
}

/**
 * 鏡面の矩形を画面の細かさで描くのに必要な大きさ[px]を求める。
 *
 * 反射の絵の横・縦は矩形の横・縦にそのまま対応し、画素は鏡面に対して均等に並ぶ。
 * 一方、斜めから見た鏡は手前ほど画面上で大きく映る。辺の画面上の長さ（全体の平均）で
 * 決めると手前が粗くなるので、四隅それぞれで「鏡面の長さあたりの画面の画素数」を測り、
 * いちばん細かい隅に合わせる。正面から見ているときは、辺の画面上の長さと同じになる。
 *
 * @param out 結果の書き込み先
 * @param rect 鏡面のローカル XY での矩形
 * @param viewportWidth 見ているカメラが描く範囲の幅[px]
 * @param viewportHeight 同・高さ[px]
 * @returns 矩形の隅がカメラの後ろにあって求められないとき null
 */
export function getMirrorScreenSize(
  out: ScreenSize,
  viewer: Camera,
  mirrorMatrixWorld: Matrix4,
  rect: MirrorRect,
  viewportWidth: number,
  viewportHeight: number,
): ScreenSize | null {
  _viewInverse.copy(viewer.matrixWorld).invert()
  let width = 0
  let height = 0
  for (const [signX, signY] of CORNER_SIGNS) {
    const x = signX < 0 ? rect.minX : rect.maxX
    const y = signY < 0 ? rect.minY : rect.maxY
    // 隅から、向かいの隅のほうへ辺に沿って少しだけ進んだ点
    const stepX = (signX < 0 ? rect.maxX - rect.minX : rect.minX - rect.maxX) * DENSITY_SAMPLE_RATIO
    const stepY = (signY < 0 ? rect.maxY - rect.minY : rect.minY - rect.maxY) * DENSITY_SAMPLE_RATIO

    if (!projectToScreen(_screenCorner, x, y, viewer, mirrorMatrixWorld, viewportWidth, viewportHeight))
      return null

    if (
      !projectToScreen(
        _screenNeighbor,
        x + stepX,
        y,
        viewer,
        mirrorMatrixWorld,
        viewportWidth,
        viewportHeight,
      )
    )
      return null
    width = Math.max(
      width,
      Math.hypot(_screenNeighbor.x - _screenCorner.x, _screenNeighbor.y - _screenCorner.y) /
        DENSITY_SAMPLE_RATIO,
    )

    if (
      !projectToScreen(
        _screenNeighbor,
        x,
        y + stepY,
        viewer,
        mirrorMatrixWorld,
        viewportWidth,
        viewportHeight,
      )
    )
      return null
    height = Math.max(
      height,
      Math.hypot(_screenNeighbor.x - _screenCorner.x, _screenNeighbor.y - _screenCorner.y) /
        DENSITY_SAMPLE_RATIO,
    )
  }

  out.width = width
  out.height = height
  return out
}
