import type { Layers } from 'three'
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
