export interface SkyboxProps {
  /** 上部の色（デフォルト: 0x87ceeb - 空色） */
  topColor?: number
  /** 下部の色（デフォルト: 0xffffff - 白） */
  bottomColor?: number
  /** グラデーションの開始位置（デフォルト: 0） */
  offset?: number
  /** グラデーションの範囲（デフォルト: 1） */
  exponent?: number
}
