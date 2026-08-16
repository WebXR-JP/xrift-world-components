import { describe, expect, it } from 'vitest'
import { SYNC_DEAD_BAND, SYNC_RATE_ADJUSTMENT } from '../constants'
import { computeTargetTime, decideVideoSyncAction, isTimeBuffered } from '../utils'

describe('computeTargetTime', () => {
  const anchor = { anchorMediaTime: 10, anchorServerTime: 1_000_000, duration: 120, loop: true }

  it('アンカーからの経過時間ぶん進んだ位置を返す', () => {
    // アンカーの5秒後
    const target = computeTargetTime({
      ...anchor,
      serverNow: 1_005_000,
      isPlaying: true,
    })

    expect(target).toBeCloseTo(15, 6)
  })

  it('後から入った人も自分で正しい位置を計算できる（通信ゼロ）', () => {
    // 入室が2分後でも、アンカーさえあれば目標は決まる
    const target = computeTargetTime({
      ...anchor,
      serverNow: 1_000_000 + 120_000,
      isPlaying: true,
    })

    // 10 + 120 = 130 → 120秒の動画なので折り返して 10
    expect(target).toBeCloseTo(10, 6)
  })

  it('停止中は時間が進まない', () => {
    const target = computeTargetTime({
      ...anchor,
      serverNow: 1_060_000,
      isPlaying: false,
    })

    expect(target).toBe(10)
  })

  it('ループしないなら折り返さない', () => {
    const target = computeTargetTime({
      ...anchor,
      loop: false,
      serverNow: 1_000_000 + 120_000,
      isPlaying: true,
    })

    expect(target).toBeCloseTo(130, 6)
  })

  it('メタデータ未読み込み（duration が NaN）でも壊れない', () => {
    const target = computeTargetTime({
      ...anchor,
      duration: Number.NaN,
      serverNow: 1_005_000,
      isPlaying: true,
    })

    expect(target).toBeCloseTo(15, 6)
  })

  it('アンカーが未来でも負の位置を返さない', () => {
    const target = computeTargetTime({
      ...anchor,
      serverNow: 1_000_000 - 60_000,
      isPlaying: true,
    })

    expect(target).toBeGreaterThanOrEqual(0)
  })
})

describe('isTimeBuffered', () => {
  const buffered = [{ start: 0, end: 30 }]

  it('バッファ内なら true', () => {
    expect(isTimeBuffered(buffered, 10)).toBe(true)
  })

  it('バッファ外なら false', () => {
    expect(isTimeBuffered(buffered, 60)).toBe(false)
  })

  it('バッファの端ぎりぎりは避ける（着地直後に止まるため）', () => {
    expect(isTimeBuffered(buffered, 29.5)).toBe(false)
  })
})

describe('decideVideoSyncAction', () => {
  const base = {
    targetTime: 100,
    currentTime: 100,
    buffered: [{ start: 90, end: 130 }],
    trustworthy: true,
    positioned: true,
  }

  it('時計が信用できないなら何もしない', () => {
    // 精度が出ていないのに合わせにいくと体験を壊す（VR180 の「同期中」の嵐）
    const action = decideVideoSyncAction({
      ...base,
      trustworthy: false,
      currentTime: 0,
      positioned: false,
    })

    expect(action.type).toBe('none')
  })

  it('入室直後はバッファを待たずにシークして追いつく', () => {
    const action = decideVideoSyncAction({
      ...base,
      positioned: false,
      currentTime: 0,
      buffered: [{ start: 0, end: 5 }],
    })

    expect(action).toEqual({ type: 'seek', seekTo: 100, playbackRate: 1 })
  })

  it('dead band 内なら何もせず、速度を1に戻す', () => {
    const action = decideVideoSyncAction({
      ...base,
      currentTime: 100 - SYNC_DEAD_BAND / 2,
    })

    // 戻し忘れると反対側へ突き抜けて振動し続ける
    expect(action).toEqual({ type: 'none', playbackRate: 1 })
  })

  it('小さな遅れは再生速度で穏やかに寄せる', () => {
    const action = decideVideoSyncAction({ ...base, currentTime: 99 })

    expect(action).toEqual({ type: 'rate', playbackRate: 1 + SYNC_RATE_ADJUSTMENT })
  })

  it('小さな進みすぎは速度を落として寄せる', () => {
    const action = decideVideoSyncAction({ ...base, currentTime: 101 })

    expect(action).toEqual({ type: 'rate', playbackRate: 1 - SYNC_RATE_ADJUSTMENT })
  })

  it('大きくズレていて、目標がバッファ内ならシークする', () => {
    const action = decideVideoSyncAction({ ...base, currentTime: 120, targetTime: 100 })

    expect(action).toEqual({ type: 'seek', seekTo: 100, playbackRate: 1 })
  })

  it('大きくズレていても、目標がバッファ外なら何もしない', () => {
    // 補正のコストが誤差より大きい。シークするとバッファが切れて
    // 「ズレる → シーク → バッファ切れ → さらにズレる」の無限ループになる
    const action = decideVideoSyncAction({
      ...base,
      currentTime: 10,
      targetTime: 100,
      buffered: [{ start: 0, end: 20 }],
    })

    expect(action).toEqual({ type: 'none', playbackRate: 1 })
  })
})
