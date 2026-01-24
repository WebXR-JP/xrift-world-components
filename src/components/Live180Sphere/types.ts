export interface Live180SphereProps {
  /** ライブストリームのURL（HLS .m3u8形式） */
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
  /** プレースホルダーの色（動画読み込み前に表示、デフォルト: 黒） */
  placeholderColor?: string
  /** エラー時のコールバック */
  onError?: (error: Error) => void
  /** バッファリング状態変更時のコールバック */
  onBufferingChange?: (isBuffering: boolean) => void
}
