import {
  SYNC_BUFFER_MARGIN,
  SYNC_DEAD_BAND,
  SYNC_RATE_ADJUSTMENT,
  SYNC_RATE_LIMIT,
} from './constants'

/**
 * アンカー（「サーバ時刻 T のとき再生位置は M だった」）から、
 * いまの再生位置の目標値を求める
 *
 * 状態に「いまの再生位置」を持たせると、受け取った瞬間には既に古い。
 * アンカーで持てば**後から入った人も自分で正しい位置を計算できる**（通信ゼロ）。
 *
 * @param duration 動画の長さ（秒）。ループ再生の折り返しに使う。
 *                 メタデータ未読み込みで NaN / 0 のときは折り返さない
 */
export function computeTargetTime(params: {
  /** アンカーの再生位置（秒） */
  anchorMediaTime: number
  /** アンカーのサーバ時刻（ms） */
  anchorServerTime: number
  /** いまのサーバ時刻（ms） */
  serverNow: number
  isPlaying: boolean
  duration: number
  loop: boolean
}): number {
  const { anchorMediaTime, anchorServerTime, serverNow, isPlaying, duration, loop } = params

  // 停止中は時間が進まないので、アンカーの位置がそのまま目標
  if (!isPlaying) return Math.max(0, anchorMediaTime)

  const elapsed = (serverNow - anchorServerTime) / 1000
  const target = anchorMediaTime + elapsed

  if (!loop || !Number.isFinite(duration) || duration <= 0) return Math.max(0, target)

  // ループ再生では長さで折り返す。負にもなり得る（アンカーが未来の場合）ので剰余を正規化する
  return ((target % duration) + duration) % duration
}

/** 再生位置がバッファ済みの範囲に入っているか（端の余裕を見る） */
export function isTimeBuffered(
  buffered: Array<{ start: number; end: number }>,
  time: number,
): boolean {
  return buffered.some(
    (range) => time >= range.start && time <= range.end - SYNC_BUFFER_MARGIN,
  )
}

/** 同期のためにこのフレームで何をするか */
export type VideoSyncAction =
  /** 何もしない（合っている / 補正のコストが誤差より大きい） */
  | { type: 'none'; playbackRate: 1 }
  /** 再生速度で穏やかに寄せる */
  | { type: 'rate'; playbackRate: number }
  /** シークで一気に合わせる */
  | { type: 'seek'; seekTo: number; playbackRate: 1 }

/**
 * 目標位置と現在位置から、取るべき補正を決める
 *
 * **原則: 補正のコストが誤差より大きいなら補正しない。**
 * ズレを直すためにシークしてバッファが切れるくらいなら、ズレたまま再生を続けるほうが
 * 体験は良い。これを守らないと「ズレる → シーク → バッファ切れ → さらにズレる」の
 * 無限ループになる（VR180 プレイヤーで実際に起きた）。
 *
 * @param positioned 一度でも位置合わせが済んでいるか。
 *                   入室直後（false）はバッファが無いのが当たり前なので、
 *                   バッファ判定を待たずにシークする（これが late-join の追いつき）
 */
export function decideVideoSyncAction(params: {
  targetTime: number
  currentTime: number
  buffered: Array<{ start: number; end: number }>
  /** 共有時計が用途に足る精度か。false なら合わせにいかない */
  trustworthy: boolean
  positioned: boolean
}): VideoSyncAction {
  const { targetTime, currentTime, buffered, trustworthy, positioned } = params

  // 時計が信用できないなら同期を諦める。精度が出ていないのに合わせにいくと体験を壊す
  if (!trustworthy) return { type: 'none', playbackRate: 1 }

  // 入室直後は一度だけ無条件にシークして追いつく（バッファはこれから作られる）
  if (!positioned) return { type: 'seek', seekTo: targetTime, playbackRate: 1 }

  const diff = targetTime - currentTime
  const distance = Math.abs(diff)

  // 合っている。速度を戻すのを忘れると反対側へ突き抜けて振動し続ける
  if (distance < SYNC_DEAD_BAND) return { type: 'none', playbackRate: 1 }

  // 速度で吸収できる範囲は穏やかに寄せる（シークより体験が良い）
  if (distance < SYNC_RATE_LIMIT) {
    return { type: 'rate', playbackRate: 1 + Math.sign(diff) * SYNC_RATE_ADJUSTMENT }
  }

  // 目標がバッファ内にあるときだけシークする。
  // バッファ外へのシークは再生が止まるので、ズレたまま再生を続けるほうがまし
  if (isTimeBuffered(buffered, targetTime)) {
    return { type: 'seek', seekTo: targetTime, playbackRate: 1 }
  }

  return { type: 'none', playbackRate: 1 }
}

/** `TimeRanges` を素の配列にする（テストしやすくするため） */
export function toBufferedRanges(ranges: TimeRanges | null): Array<{ start: number; end: number }> {
  if (!ranges) return []
  const result: Array<{ start: number; end: number }> = []
  for (let index = 0; index < ranges.length; index++) {
    result.push({ start: ranges.start(index), end: ranges.end(index) })
  }
  return result
}
