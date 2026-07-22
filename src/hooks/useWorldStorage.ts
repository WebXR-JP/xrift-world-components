import {
  type WorldStorageContextValue,
  useWorldStorageContext,
} from '../contexts/WorldStorageContext'

/**
 * ワールド単位のKV永続化（World Storage）を提供するフック
 * ランキング・ワールド内通貨・登録情報などをワールドをまたいで永続化できる
 *
 * 制約・指針:
 * - 保存は「ゲームイベントの節目」で行う。毎フレームの同期は揮発性の状態同期
 *   （useInstanceState など）を使う（書き込みはユーザーごと 30回/分 のレートリミットあり）
 * - 容量: ワールドごと合計 10MB / 1エントリ 100KB / 共有256キー / ユーザーあたり64キー
 * - キー形式: `/^[A-Za-z0-9_.\-:]{1,128}$/`
 * - 読み取りは公開（認証不要で API から読める）。秘密情報を入れないこと
 * - ゲストは読み取りのみ（書き込みは WorldStorageError になる）
 * - 通貨・スコアの加算は set ではなく increment を使う（同時実行でも加算がロストしない）
 *
 * @example
 * const storage = useWorldStorage()
 *
 * // 共有KV（ワールドに1つの共有値）
 * await storage.shared.set('event_phase', '第2章')
 * const phase = await storage.shared.get('event_phase')
 * const visits = await storage.shared.increment('total_visits', 1)
 *
 * // ユーザー別KV（書き込みは自分の値のみ。読み取りは他人の値も可）
 * await storage.player.set('coins', 340)
 * const coins = await storage.player.get('coins')
 * const otherScore = await storage.player.get('score', { userId })
 *
 * @throws {Error} XRiftProvider の外で呼び出された場合
 */
export const useWorldStorage = (): WorldStorageContextValue => {
  return useWorldStorageContext()
}
