/** 掴む/離すのキー */
export const GRAB_KEY = 'g'

/** 掴んでいる間のカメラ→対象の最小距離[m]（近すぎで自キャラに埋まるのを防ぐ） */
export const MIN_HOLD_DISTANCE = 1.0

/** 掴んでいる間のカメラ→対象の最大距離[m] */
export const MAX_HOLD_DISTANCE = 10.0

/** レイキャストを間引くフレーム間隔（パフォーマンス対策） */
export const RAYCAST_FRAME_INTERVAL = 5

/** userData から grabbable ID を辿る際の最大親階層 */
export const MAX_ANCESTOR_DEPTH = 12

/** VR でレイの先に浮かせるときの手→対象の最小距離[m]（本番と同じ） */
export const VR_MIN_HOLD_DISTANCE = 0.3

/** グリップをこれ以上握ったら掴む（本番と同じ） */
export const VR_GRIP_PRESS_THRESHOLD = 0.6

/** グリップをこれ以下まで緩めたら離す（握り直しでばたつかないよう掴むより低くする） */
export const VR_GRIP_RELEASE_THRESHOLD = 0.3

/** 手から物の外形までこの距離[m]以内なら「触れている」とみなす */
export const VR_TOUCH_RADIUS = 0.06

/** 右スティック上下で距離を変える速さ[m/s] */
export const VR_STICK_DISTANCE_SPEED = 3

/** 右スティック上下のデッドゾーン */
export const VR_STICK_DEADZONE = 0.2
