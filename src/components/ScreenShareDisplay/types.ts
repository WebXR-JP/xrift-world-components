export interface Props {
  /** スクリーンの一意なID */
  id: string
  /** スクリーンの位置 */
  position?: [number, number, number]
  /** スクリーンの回転 */
  rotation?: [number, number, number]
  /** スクリーンのサイズ [幅, 高さ] */
  scale?: [number, number]

  // ---- 映像ソース ----
  /** 表示する映像のvideo要素 */
  videoElement?: HTMLVideoElement | null

  // ---- インタラクション状態 ----
  /** 自分が共有中か */
  isSharing?: boolean
  /** 共有開始可能か */
  canStartShare?: boolean
  /** 共有開始コールバック */
  onStartShare?: () => void
  /** 共有停止コールバック */
  onStopShare?: () => void

  // ---- 表示カスタマイズ ----
  /** 未共有時のガイドテキスト */
  guideText?: string
  /** 開始時のインタラクションテキスト */
  startShareText?: string
  /** 停止時のインタラクションテキスト */
  stopShareText?: string
  /** 背景色（映像なし時） */
  backgroundColor?: string
  /** ガイドテキストの色 */
  guideTextColor?: string

  // ---- インタラクション制御 ----
  /** インタラクション有効化（デフォルト: true） */
  interactable?: boolean
}
