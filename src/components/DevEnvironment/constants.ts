/**
 * 物理定数（xrift-frontend 準拠）
 */
export const PLAYER_HALF_HEIGHT = 0.4
export const PLAYER_RADIUS = 0.4
export const MOVE_SPEED = 5.0
export const JUMP_VELOCITY = 4.5
export const LINEAR_DAMPING = 0.2
export const CAMERA_Y_OFFSET = 0.64
export const RESPAWN_Y_THRESHOLD = -10
export const DEFAULT_SPAWN_POSITION: [number, number, number] = [0.11, 1.6, 7.59]
export const DEFAULT_GRAVITY = 9.81
export const DEFAULT_ALLOW_INFINITE_JUMP = true
export const DEFAULT_CAMERA_NEAR = 0.01
export const DEFAULT_CAMERA_FAR = 1000

/**
 * クロスヘアスタイル定数
 */
export const CROSSHAIR_SIZE = 20
export const CROSSHAIR_THICKNESS = 2
export const CROSSHAIR_ACTIVE_THICKNESS = 3
export const HIGHLIGHT_COLOR = '#4dabf7'

/**
 * DevEnvironment 上のローカルユーザー定数
 * 本番環境では xrift-frontend が UsersProvider に実装を注入するが、
 * DevEnvironment ではダミーのユーザー情報を提供して useUsers を機能させる
 */
export const DEV_LOCAL_USER_ID = 'dev-local-user'
export const DEV_LOCAL_USER_DISPLAY_NAME = 'Dev User'

/**
 * DummyAvatar の見た目に基づく高さ情報
 * eyeHeight はカプセル底面（地面）からカメラまでの距離
 */
export const DEV_AVATAR_HEIGHT = 1.5
export const DEV_EYE_HEIGHT = PLAYER_HALF_HEIGHT + PLAYER_RADIUS + CAMERA_Y_OFFSET
