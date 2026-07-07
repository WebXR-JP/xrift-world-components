/** 掴む/離すのキー */
export const GRAB_KEY = 'g'

/** 掴んでいる間のカメラ→対象の最小距離[m]（近すぎで自キャラに埋まるのを防ぐ） */
export const MIN_HOLD_DISTANCE = 1.0

/** 掴んでいる間のカメラ→対象の最大距離[m] */
export const MAX_HOLD_DISTANCE = 10.0

/** ホイール1ノッチあたりの距離変化[m] */
export const WHEEL_DISTANCE_STEP = 0.5

/** ゴーストの不透明度 */
export const GRAB_GHOST_OPACITY = 0.5

/** レイキャストを間引くフレーム間隔（パフォーマンス対策） */
export const RAYCAST_FRAME_INTERVAL = 5

/** userData から grabbable ID を辿る際の最大親階層 */
export const MAX_ANCESTOR_DEPTH = 12
