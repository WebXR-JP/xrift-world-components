import type { ComponentType, ReactNode } from 'react'
import type { ItemComponentProps } from '../../contexts/ItemLoaderContext'

export interface PhysicsConfig {
  /** 重力加速度（デフォルト: 9.81） */
  gravity?: number
  /** 無限ジャンプを許可するか（デフォルト: true） */
  allowInfiniteJump?: boolean
}

export interface CameraConfig {
  /** nearクリッピング距離（デフォルト: 0.01） */
  near?: number
  /** farクリッピング距離（デフォルト: 1000） */
  far?: number
}

export interface Props {
  children: ReactNode
  /**
   * `<Item itemId>` に差し込むローカルのアイテム（itemId → コンポーネント）
   *
   * アイテムとワールドを同時に作っているとき・まだアップロードしていないときに使う。
   * 指定の無い itemId は、開発サーバーの中継（@xrift/sdk/vite の xriftDev()）経由で本番の
   * バンドルを読む
   */
  items?: Record<string, ComponentType<ItemComponentProps>>
  /** カメラ設定 */
  camera?: { position?: [number, number, number]; fov?: number; near?: number; far?: number }
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
  /** 出力バッファタイプ（"UnsignedByteType" | "HalfFloatType" | "FloatType"） */
  outputBufferType?: string
}
