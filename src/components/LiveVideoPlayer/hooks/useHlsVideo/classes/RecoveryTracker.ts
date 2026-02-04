/** リカバリのスロットリング間隔（ms） */
const RECOVERY_THROTTLE_MS = 5000
/** リカバリ失敗とみなすまでの最大試行回数 */
const MAX_RECOVERY_ATTEMPTS = 3

/**
 * エラーリカバリの試行を追跡するクラス
 * スロットリングと試行回数制限を管理
 */
export class RecoveryTracker {
  private lastRecoveryTime = 0
  private recoveryAttempts = 0
  private errorReported = false

  /** 状態をリセット */
  reset(): void {
    this.lastRecoveryTime = 0
    this.recoveryAttempts = 0
    this.errorReported = false
  }

  /** エラーが既に報告済みかどうか */
  get isErrorReported(): boolean {
    return this.errorReported
  }

  /** エラーを報告済みとしてマーク */
  markErrorReported(): void {
    this.errorReported = true
  }

  /**
   * リカバリを試行可能かどうかを判定し、カウンターを更新
   * @returns リカバリを試行すべきかどうか
   */
  shouldAttemptRecovery(): boolean {
    const now = Date.now()
    const timeSinceLastRecovery = now - this.lastRecoveryTime

    // スロットリング: 5秒以内の連続エラーはカウント増加
    if (timeSinceLastRecovery < RECOVERY_THROTTLE_MS) {
      this.recoveryAttempts++
    } else {
      // 5秒以上経過していればカウントリセット
      this.recoveryAttempts = 1
    }

    this.lastRecoveryTime = now

    // 最大試行回数を超えた場合はリカバリ失敗
    if (this.recoveryAttempts > MAX_RECOVERY_ATTEMPTS) {
      console.error(
        `[RecoveryTracker] Recovery failed after ${MAX_RECOVERY_ATTEMPTS} attempts`
      )
      return false
    }

    console.log(
      `[RecoveryTracker] Attempting recovery (attempt ${this.recoveryAttempts}/${MAX_RECOVERY_ATTEMPTS})`
    )
    return true
  }
}
