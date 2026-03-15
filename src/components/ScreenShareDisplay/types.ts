export interface Props {
  /** スクリーンの一意なID */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンの幅（高さは16:9で自動計算） */
  width?: number
  /** テクスチャ更新のフレームレート上限（低スペック端末向け。省略時は制限なし） */
  targetFps?: number
}
