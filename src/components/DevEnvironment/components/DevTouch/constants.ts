/** 本番（xrift-frontend の VirtualJoystick）と同じ大きさ・遊び */
export const JOYSTICK_SIZE = 100
export const BUTTON_SIZE = 60
export const JOYSTICK_MAX_DISTANCE = 40
export const JOYSTICK_DEAD_ZONE = 0.1

/** 画面をドラッグして見回す感度（rad/px。本番の mouseSensitivity 0.002 × 2） */
export const TOUCH_LOOK_SENSITIVITY = 0.004
/** 見上げ・見下ろしの限界（本番の polarAngle 0.1π〜0.9π と同じ） */
export const TOUCH_LOOK_MAX_PITCH = Math.PI * 0.4
/** これより小さい指の動きは見回しにしない（タップのぶれ） */
export const TOUCH_LOOK_MIN_DELTA = 2

/** タッチの端末か（本番と同じく、マウスで細かく狙える端末以外） */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)'
