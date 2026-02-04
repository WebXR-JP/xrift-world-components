import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RecoveryTracker } from '../RecoveryTracker'

describe('RecoveryTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('shouldAttemptRecovery', () => {
    it('初回のリカバリ試行は true を返す', () => {
      const tracker = new RecoveryTracker()
      expect(tracker.shouldAttemptRecovery()).toBe(true)
    })

    it('5秒以内の連続リカバリは試行回数をカウントアップ', () => {
      const tracker = new RecoveryTracker()

      expect(tracker.shouldAttemptRecovery()).toBe(true) // 1回目
      vi.advanceTimersByTime(1000) // 1秒後
      expect(tracker.shouldAttemptRecovery()).toBe(true) // 2回目
      vi.advanceTimersByTime(1000) // さらに1秒後
      expect(tracker.shouldAttemptRecovery()).toBe(true) // 3回目
      vi.advanceTimersByTime(1000) // さらに1秒後
      expect(tracker.shouldAttemptRecovery()).toBe(false) // 4回目: 上限超過
    })

    it('5秒以上経過するとカウントがリセットされる', () => {
      const tracker = new RecoveryTracker()

      expect(tracker.shouldAttemptRecovery()).toBe(true) // 1回目
      vi.advanceTimersByTime(1000)
      expect(tracker.shouldAttemptRecovery()).toBe(true) // 2回目
      vi.advanceTimersByTime(1000)
      expect(tracker.shouldAttemptRecovery()).toBe(true) // 3回目

      // 5秒以上経過
      vi.advanceTimersByTime(6000)
      expect(tracker.shouldAttemptRecovery()).toBe(true) // リセットされて1回目として扱われる
    })
  })

  describe('reset', () => {
    it('リカバリカウントをリセット', () => {
      const tracker = new RecoveryTracker()

      // 3回試行
      tracker.shouldAttemptRecovery()
      vi.advanceTimersByTime(100)
      tracker.shouldAttemptRecovery()
      vi.advanceTimersByTime(100)
      tracker.shouldAttemptRecovery()
      vi.advanceTimersByTime(100)

      // 4回目は失敗するはず
      expect(tracker.shouldAttemptRecovery()).toBe(false)

      // リセット
      tracker.reset()

      // リセット後は再度成功
      expect(tracker.shouldAttemptRecovery()).toBe(true)
    })

    it('エラー報告フラグもリセット', () => {
      const tracker = new RecoveryTracker()
      tracker.markErrorReported()
      expect(tracker.isErrorReported).toBe(true)

      tracker.reset()
      expect(tracker.isErrorReported).toBe(false)
    })
  })

  describe('isErrorReported / markErrorReported', () => {
    it('初期状態は false', () => {
      const tracker = new RecoveryTracker()
      expect(tracker.isErrorReported).toBe(false)
    })

    it('markErrorReported で true になる', () => {
      const tracker = new RecoveryTracker()
      tracker.markErrorReported()
      expect(tracker.isErrorReported).toBe(true)
    })
  })
})
