/**
 * VR の入力（xrift-frontend の VRInputHandler・xrGamepad と同じ値）
 */

/** xr-standard の gamepad のボタン番号（左右とも同じ並び） */
export const XR_BUTTON = {
  /** 右の A・左の X */
  PRIMARY: 4,
} as const

/** スティックの軸（上と左が負） */
export const XR_AXIS = {
  STICK_X: 2,
  STICK_Y: 3,
} as const

/** 移動のデッドゾーン（ハードウェアのノイズを消す） */
export const MOVE_DEADZONE = 0.02
/** このくらい倒したらスナップ回転する */
export const SNAP_THRESHOLD = 0.7
/** ここまで戻したら、次のスナップ回転を受け付ける */
export const SNAP_RESET_THRESHOLD = 0.3
/** スナップ回転の角度（本番の既定と同じ 45°） */
export const SNAP_ANGLE_DEG = 45
