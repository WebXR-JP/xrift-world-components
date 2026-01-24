export interface Video180SphereProps {
  /** 動画のURL */
  url: string
  /** 位置 */
  position?: [number, number, number]
  /** 回転 */
  rotation?: [number, number, number]
  /** スケール */
  scale?: number | [number, number, number]
  /** 再生状態 */
  playing?: boolean
  /** ミュート状態（trueにするとブラウザの自動再生制限を回避できる） */
  muted?: boolean
  /** 音量 (0-1) */
  volume?: number
  /** 半球の半径 */
  radius?: number
  /** ジオメトリの解像度（セグメント数） */
  segments?: number
  /** ループ再生するか */
  loop?: boolean
  /** プレースホルダーの色（動画読み込み前に表示、デフォルト: 黒） */
  placeholderColor?: string
  /** 動画終了時のコールバック */
  onEnded?: () => void
  /** メタデータ読み込み時のコールバック */
  onLoadedMetadata?: (event: { duration: number }) => void
  /** 再生進捗更新時のコールバック */
  onProgress?: (event: { currentTime: number }) => void
}
