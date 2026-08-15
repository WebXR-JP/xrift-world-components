import { describe, expect, it } from 'vitest'
import {
  SERVER_CLOCK_ACCURACY_THRESHOLD,
  createDefaultServerClockImplementation,
  isServerClockAccurateEnough,
} from '../ServerClockContext'

describe('createDefaultServerClockImplementation', () => {
  it('端末のローカル時計を返す', () => {
    const clock = createDefaultServerClockImplementation()

    expect(clock.now()).toBeCloseTo(Date.now(), -2)
  })

  it('信用できないことを明示する（未注入の判別）', () => {
    const clock = createDefaultServerClockImplementation()

    // 他の端末とは 0.1〜数秒ずれている前提なので、合わせにいってはいけない
    expect(clock.synced).toBe(false)
    expect(clock.uncertainty).toBe(Number.POSITIVE_INFINITY)
    expect(clock.timeJumpCount).toBe(0)
  })
})

describe('isServerClockAccurateEnough', () => {
  it('同期していなければ用途によらず false', () => {
    const clock = { synced: false, uncertainty: 5 }

    expect(isServerClockAccurateEnough(clock, 'media')).toBe(false)
    expect(isServerClockAccurateEnough(clock, 'motion')).toBe(false)
  })

  it('しきい値以下なら true', () => {
    const clock = { synced: true, uncertainty: SERVER_CLOCK_ACCURACY_THRESHOLD.motion }

    expect(isServerClockAccurateEnough(clock, 'motion')).toBe(true)
    expect(isServerClockAccurateEnough(clock, 'media')).toBe(true)
  })

  it('用途ごとに要求精度が違う', () => {
    // 動画なら許容できるが、決定論的アニメーションには粗いケース
    const clock = { synced: true, uncertainty: 200 }

    expect(isServerClockAccurateEnough(clock, 'media')).toBe(true)
    expect(isServerClockAccurateEnough(clock, 'motion')).toBe(false)
  })

  it('しきい値を超えたら false', () => {
    const clock = { synced: true, uncertainty: 1000 }

    expect(isServerClockAccurateEnough(clock, 'media')).toBe(false)
  })

  it('実測（本番デスクトップ, uncertainty ±40ms）はどちらの用途も満たす', () => {
    const clock = { synced: true, uncertainty: 40 }

    expect(isServerClockAccurateEnough(clock, 'media')).toBe(true)
    expect(isServerClockAccurateEnough(clock, 'motion')).toBe(true)
  })
})
