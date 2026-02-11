import type { ReactNode } from 'react'

export interface PhysicsConfig {
  /** 重力加速度（デフォルト: 9.81） */
  gravity?: number
  /** 無限ジャンプを許可するか（デフォルト: true） */
  allowInfiniteJump?: boolean
}

export interface Props {
  children: ReactNode
  /** カメラ設定 */
  camera?: { position?: [number, number, number]; fov?: number }
  /** 移動速度（デフォルト: 5.0） */
  moveSpeed?: number
  /** シャドウを有効にするか（デフォルト: true） */
  shadows?: boolean
  /** スポーン位置（デフォルト: [0.11, 1.6, 7.59]） */
  spawnPosition?: [number, number, number]
  /** リスポーンの高さ閾値（デフォルト: -10） */
  respawnThreshold?: number
  /** 物理設定 */
  physicsConfig?: PhysicsConfig
}
