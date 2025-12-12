export interface Props {
  /** スクリーンの一意なID */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンのサイズ [幅, 高さ] */
  scale?: [number, number]
}
