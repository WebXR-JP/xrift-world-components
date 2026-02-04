/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NativeHlsPlayer } from '../NativeHlsPlayer'
import { RecoveryTracker } from '../RecoveryTracker'

// MediaError 定数（jsdom にないため定義）
const MEDIA_ERR_DECODE = 3
const MEDIA_ERR_NETWORK = 2

describe('NativeHlsPlayer', () => {
  let video: HTMLVideoElement
  let tracker: RecoveryTracker

  beforeEach(() => {
    video = document.createElement('video')
    tracker = new RecoveryTracker()
  })

  it('load で video.src が設定される', () => {
    const player = new NativeHlsPlayer({
      video,
      tracker,
      callbacks: {},
    })

    player.load('https://example.com/video.m3u8')
    expect(video.src).toContain('video.m3u8')
  })

  it('destroy でエラーイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(video, 'removeEventListener')

    const player = new NativeHlsPlayer({
      video,
      tracker,
      callbacks: {},
    })

    player.destroy()
    expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
  })

  it('デコードエラー時に currentTime をスキップしてリカバリを試みる', () => {
    const playSpy = vi.spyOn(video, 'play').mockResolvedValue()

    new NativeHlsPlayer({
      video,
      tracker,
      callbacks: {},
    })

    // video.currentTime を設定
    Object.defineProperty(video, 'currentTime', {
      value: 10,
      writable: true,
    })

    // MEDIA_ERR_DECODE エラーをシミュレート
    Object.defineProperty(video, 'error', {
      value: { code: MEDIA_ERR_DECODE, message: 'Decode error' },
    })

    // エラーイベントを発火
    video.dispatchEvent(new Event('error'))

    // currentTime が 0.5 秒進んでいることを確認
    expect(video.currentTime).toBe(10.5)
    expect(playSpy).toHaveBeenCalled()
  })

  it('リカバリ上限を超えると onError が呼ばれる', () => {
    const onError = vi.fn()

    new NativeHlsPlayer({
      video,
      tracker,
      callbacks: { onError },
    })

    // MEDIA_ERR_DECODE エラーを設定
    Object.defineProperty(video, 'error', {
      value: { code: MEDIA_ERR_DECODE, message: 'Decode error' },
    })

    // リカバリ試行を消費
    tracker.shouldAttemptRecovery() // 1
    tracker.shouldAttemptRecovery() // 2
    tracker.shouldAttemptRecovery() // 3
    tracker.shouldAttemptRecovery() // 4 - 失敗

    // エラーイベントを発火
    video.dispatchEvent(new Event('error'))

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('デコードエラー以外はすぐに onError が呼ばれる', () => {
    const onError = vi.fn()

    new NativeHlsPlayer({
      video,
      tracker,
      callbacks: { onError },
    })

    // MEDIA_ERR_NETWORK エラーを設定
    Object.defineProperty(video, 'error', {
      value: { code: MEDIA_ERR_NETWORK, message: 'Network error' },
    })

    // エラーイベントを発火
    video.dispatchEvent(new Event('error'))

    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})
