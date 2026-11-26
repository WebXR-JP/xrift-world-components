/** ヒステリシス比率（Near→Far: lodDistance, Far→Near: lodDistance * ratio） */
export const LOD_HYSTERESIS_RATIO = 0.8

/**
 * 鏡が画面上でこの大きさ[px]（長いほうの辺）より小さくなったら、反射を描かず擬似ミラーにする。
 * ここまで小さいと、何が映っているかはほとんど見分けられない
 */
export const MIN_REFLECTION_SCREEN_PIXELS = 32

/** 擬似ミラーから反射へ戻る大きさの比率（境界付近でのチラつきを防ぐ） */
export const SCREEN_SIZE_HYSTERESIS_RATIO = 1.25

/** 反射の絵の 1 辺の下限[px] */
export const MIN_REFLECTION_TEXTURE_SIZE = 8
