import { useEffect, useRef } from 'react'
import { useServerClock } from '../../hooks/useServerClock'
import { computeTargetTime, decideVideoSyncAction, toBufferedRanges } from './utils'

/** 補正を検討する間隔(ms)。毎フレームやる必要はない */
const SYNC_CHECK_INTERVAL = 500

/**
 * 共有時計のアンカーに合わせて再生位置を追従させる（issue xrift-frontend#1464 Phase 4）
 *
 * アンカー = 「サーバ時刻 `anchorServerTime` のとき再生位置は `anchorMediaTime` だった」。
 * 各クライアントが自分で目標位置を計算するので、**後から入った人も通信ゼロで追いつける**。
 *
 * `useFrame` ではなく `setInterval` で回している。補正は 0.5 秒に一度で十分なうえ、
 * `useFrame` はタブが非表示になると完全に停止してしまうため。
 */
export const useVideoTimeSync = (params: {
  video: HTMLVideoElement | null
  anchorMediaTime: number
  anchorServerTime: number
  isPlaying: boolean
  loop: boolean
  /** false のときは追従しない（sync='local' など） */
  enabled: boolean
}): void => {
  const { video, anchorMediaTime, anchorServerTime, isPlaying, loop, enabled } = params
  const clock = useServerClock({ require: 'media' })

  // 入室直後の一度だけ、バッファを待たずにシークして追いつく
  const positionedRef = useRef(false)
  // アンカーが変わったら位置合わせをやり直す（別の動画・シーク操作）
  useEffect(() => {
    positionedRef.current = false
  }, [anchorServerTime])

  // 時計が飛んだら目標が不連続に変わる。次の判定で追いつくため位置合わせからやり直す
  useEffect(() => {
    positionedRef.current = false
  }, [clock.timeJumpCount])

  // クロージャの陳腐化を避けつつ、interval を張り直さないための ref
  const stateRef = useRef({ anchorMediaTime, anchorServerTime, isPlaying, loop, clock })
  stateRef.current = { anchorMediaTime, anchorServerTime, isPlaying, loop, clock }

  useEffect(() => {
    if (!video || !enabled) return

    const syncOnce = () => {
      const state = stateRef.current
      const targetTime = computeTargetTime({
        anchorMediaTime: state.anchorMediaTime,
        anchorServerTime: state.anchorServerTime,
        serverNow: state.clock.now(),
        isPlaying: state.isPlaying,
        duration: video.duration,
        loop: state.loop,
      })

      const action = decideVideoSyncAction({
        targetTime,
        currentTime: video.currentTime,
        buffered: toBufferedRanges(video.buffered),
        trustworthy: state.clock.trustworthy,
        positioned: positionedRef.current,
      })

      // 速度は毎回明示的に戻す（戻し忘れると反対側へ突き抜けて振動し続ける）
      if (video.playbackRate !== action.playbackRate) {
        video.playbackRate = action.playbackRate
      }
      if (action.type !== 'seek') return

      video.currentTime = action.seekTo
      positionedRef.current = true
    }

    syncOnce()
    const interval = setInterval(syncOnce, SYNC_CHECK_INTERVAL)
    return () => {
      clearInterval(interval)
      // 補正をやめるときは速度を戻す
      video.playbackRate = 1
    }
  }, [video, enabled])
}
