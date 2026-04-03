import { describe, it, expect } from 'vitest'
import { calculateContainSize } from '../utils'

describe('calculateContainSize', () => {
  it('横長映像を横長スクリーンに収める（映像の方がより横長）', () => {
    // 映像 1920x1080 (16:9), スクリーン 4x3 (4:3)
    // videoAspect(1.78) > screenAspect(1.33) → 幅に合わせる
    const [w, h] = calculateContainSize(1920, 1080, 4, 3)
    expect(w).toBe(4)
    expect(h).toBeCloseTo(4 / (1920 / 1080))
  })

  it('縦長映像を横長スクリーンに収める', () => {
    // 映像 1080x1920 (9:16), スクリーン 4x2.25 (16:9)
    // videoAspect(0.5625) < screenAspect(1.78) → 高さに合わせる
    const [w, h] = calculateContainSize(1080, 1920, 4, 2.25)
    expect(h).toBe(2.25)
    expect(w).toBeCloseTo(2.25 * (1080 / 1920))
  })

  it('映像とスクリーンが同じアスペクト比の場合はぴったり収まる', () => {
    // 映像 1920x1080, スクリーン 4x2.25 (どちらも16:9)
    const [w, h] = calculateContainSize(1920, 1080, 4, 2.25)
    expect(w).toBeCloseTo(4)
    expect(h).toBeCloseTo(2.25)
  })

  it('正方形映像を横長スクリーンに収める', () => {
    // 映像 1080x1080 (1:1), スクリーン 4x2.25 (16:9)
    // videoAspect(1) < screenAspect(1.78) → 高さに合わせる
    const [w, h] = calculateContainSize(1080, 1080, 4, 2.25)
    expect(h).toBe(2.25)
    expect(w).toBeCloseTo(2.25)
  })

  it('videoWidth と videoHeight が共に 0 の場合はスクリーンサイズを返す', () => {
    const [w, h] = calculateContainSize(0, 0, 4, 2.25)
    expect(w).toBe(4)
    expect(h).toBe(2.25)
  })

  it('videoWidth のみ 0 の場合はスクリーンサイズを返す', () => {
    const [w, h] = calculateContainSize(0, 1080, 4, 2.25)
    expect(w).toBe(4)
    expect(h).toBe(2.25)
  })

  it('videoHeight のみ 0 の場合はスクリーンサイズを返す', () => {
    const [w, h] = calculateContainSize(1920, 0, 4, 2.25)
    expect(w).toBe(4)
    expect(h).toBe(2.25)
  })
})
