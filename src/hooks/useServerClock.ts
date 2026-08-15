import {
  isServerClockAccurateEnough,
  type ServerClockAccuracy,
  type ServerClockContextValue,
  useServerClockContext,
} from '../contexts/ServerClockContext'

export interface UseServerClockResult extends ServerClockContextValue {
  /**
   * `require` で指定した用途に対して時刻が十分な精度か。
   * `require` を指定しない場合は `synced` と同じ。
   */
  trustworthy: boolean
}

/**
 * インスタンス内の全端末で共有できる時計（サーバ時刻）を提供するフック
 *
 * 端末の `Date.now()` は互いに 0.1〜数秒ずれているため、動画の再生位置同期・
 * カウントダウン・同時演出・決定論的アニメーションはこれを使う。
 *
 * 指針:
 * - **`now` は関数**。値ではないので `useFrame` の中から再レンダーなしで呼べる
 * - **`discontinuityCount` の変化を見て基準を取り直す。** 通常は時刻が巻き戻らない
 *   よう徐々に補正するが、スリープ復帰などでは飛ぶ。時刻から位置を計算している
 *   ワールドは、飛んだときに基準を取り直さないとワープしたままになる
 * - **補正のコストが誤差より大きいなら補正しない。** 動画で言えば、ズレを直すために
 *   シークしてバッファが切れるくらいなら、ズレたまま再生を続けるほうが体験は良い
 * - 早押し・ゴール判定のような**公平性が要る用途には使わない**。経路の非対称ぶんの
 *   誤差は検出できず、繰り返しても平均化されない（同じ人が毎回勝つ）
 *
 * @example
 * // 動画の再生位置を合わせる
 * const clock = useServerClock({ require: 'media' })
 *
 * useFrame(() => {
 *   if (!clock.trustworthy) return          // 精度が出ていないなら諦める
 *   const target = (clock.now() - epoch) / 1000 % duration
 *   const diff = target - video.currentTime
 *   if (Math.abs(diff) < 0.3) return        // dead band
 *   if (Math.abs(diff) < 5) video.playbackRate = 1 + Math.sign(diff) * 0.05
 *   else if (isBuffered(video, target)) video.currentTime = target
 *   // バッファ外なら何もしない（同期より再生継続を優先）
 * })
 *
 * @example
 * // 全員で一致する動く床（通信ゼロ。後から入った人も即座に正しい位置になる）
 * const { now, discontinuityCount } = useServerClock()
 * const seen = useRef(discontinuityCount)
 *
 * useFrame(() => {
 *   if (seen.current !== discontinuityCount) {
 *     seen.current = discontinuityCount
 *     resetBaseline()                        // 時刻が飛んだので基準を取り直す
 *   }
 *   floor.current.position.y = Math.sin(now() / 1000) * 2
 * })
 *
 * @throws {Error} XRiftProvider の外で呼び出された場合
 */
export const useServerClock = (options?: { require?: ServerClockAccuracy }): UseServerClockResult => {
  const clock = useServerClockContext()
  const accuracy = options?.require
  return {
    ...clock,
    trustworthy: accuracy ? isServerClockAccurateEnough(clock, accuracy) : clock.synced,
  }
}
