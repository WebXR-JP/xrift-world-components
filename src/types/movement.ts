/**
 * 3D位置
 */
export interface Position3D {
  x: number
  y: number
  z: number
}

/**
 * 3D回転（オイラー角）
 */
export interface Rotation3D {
  x: number
  y: number
  z: number
}

/**
 * VRトラッキングの移動方向
 */
export type VRMovementDirection = 'forward' | 'backward' | 'left' | 'right' | 'idle'

/**
 * VRトラッキングデータ（VRモード時のみ送信）
 */
export interface VRTrackingData {
  /** ヘッド（カメラ）の回転（yaw/pitch） */
  head: {
    yaw: number
    pitch: number
  }
  /** 左手のアバター基準相対座標 */
  leftHand: {
    position: Position3D
    rotation: Rotation3D
  }
  /** 右手のアバター基準相対座標 */
  rightHand: {
    position: Position3D
    rotation: Rotation3D
  }
  /** hipsの位置変化量（初期位置からの差分、シーンローカル座標系） */
  hipsPositionDelta: Position3D
  /** 足のアニメーション状態 */
  movementDirection: VRMovementDirection
  /** ハンドトラッキングかどうか */
  isHandTracking?: boolean
}

/**
 * プレイヤーの移動状態
 * ワールド制作者がユーザーの位置・回転・移動状態を取得するために使用
 */
export interface PlayerMovement {
  /** 位置情報（ワールド座標） */
  position: Position3D
  /** 移動方向（XZ平面、正規化済みベクトル） */
  direction: { x: number; z: number }
  /** XZ平面での速度 */
  horizontalSpeed: number
  /** Y軸での速度（ジャンプ・落下） */
  verticalSpeed: number
  /** 回転情報 - yaw: y軸回転（左右）、pitch: x軸回転（上下） */
  rotation: { yaw: number; pitch: number }
  /** 地面接触判定 */
  isGrounded: boolean
  /** ジャンプ中フラグ */
  isJumping: boolean
  /** VRモードかどうか */
  isInVR?: boolean
  /** VRトラッキングデータ（VRモード時のみ） */
  vrTracking?: VRTrackingData
}
