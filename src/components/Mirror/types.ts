export interface MirrorProps {
  /** 鏡の位置 */
  position?: [number, number, number]
  /** 鏡の回転 */
  rotation?: [number, number, number]
  /** 鏡のサイズ [幅, 高さ] */
  size?: [number, number]
  /** 反射の色（デフォルト: 0xcccccc） */
  color?: number
  /** 反射テクスチャの解像度（デフォルト: 512）。sizeの比率に応じて自動調整されます */
  textureResolution?: number
  /** この距離（メートル）を超えると envMap ベースの擬似ミラーに切り替え（デフォルト: 10） */
  lodDistance?: number
}
