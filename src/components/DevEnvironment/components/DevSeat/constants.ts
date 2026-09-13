/**
 * DevEnvironment の着席まわりの定数（xrift-frontend の SeatSystem と同じ値）
 */
export const ESTIMATED_SEATED_HIP_RATIO = 0.3
export const STANDING_HIP_RATIO = 0.5
export const SEAT_CONTACT_BELOW_HIPS_RATIO = 0.05
export const FALLBACK_EYE_HEIGHT_RATIO = 0.9

/** 座席の前方へカメラを出す距離[m]。胸・肩が視界に入らないためのクリアランス */
export const DEV_SEAT_CAMERA_FORWARD_CLEARANCE = 0.15

/**
 * 1フレームの上限[s]。タブ切り替え復帰時などの大きな delta をそのまま onDrive に渡すと
 * 乗り物が大きくジャンプするため丸める（本番の MAX_FRAME_DELTA と同じ値）
 */
export const DEV_MAX_FRAME_DELTA = 0.05
