import { describe, expect, it } from 'vitest'
import { shouldUpdateReflection, shouldUseReflector } from '../utils'
import { LOD_HYSTERESIS_RATIO } from '../constants'

describe('shouldUseReflector', () => {
  const lodDistance = 10
  const hysteresis = LOD_HYSTERESIS_RATIO // 0.8

  describe('現在 Reflector を使用中', () => {
    it('距離が lodDistance 以下なら true を返す', () => {
      expect(shouldUseReflector(5, lodDistance, true, hysteresis)).toBe(true)
      expect(shouldUseReflector(10, lodDistance, true, hysteresis)).toBe(true)
    })

    it('距離が lodDistance を超えたら false を返す', () => {
      expect(shouldUseReflector(10.1, lodDistance, true, hysteresis)).toBe(false)
      expect(shouldUseReflector(15, lodDistance, true, hysteresis)).toBe(false)
    })
  })

  describe('現在 envMap を使用中', () => {
    it('距離が lodDistance * hysteresis 以下なら true に戻る', () => {
      expect(shouldUseReflector(7, lodDistance, false, hysteresis)).toBe(true)
      expect(shouldUseReflector(8, lodDistance, false, hysteresis)).toBe(true)
    })

    it('ヒステリシス範囲内（8〜10m）では false を維持する', () => {
      expect(shouldUseReflector(8.5, lodDistance, false, hysteresis)).toBe(false)
      expect(shouldUseReflector(9, lodDistance, false, hysteresis)).toBe(false)
      expect(shouldUseReflector(10, lodDistance, false, hysteresis)).toBe(false)
    })

    it('距離が lodDistance を超えていれば false を維持する', () => {
      expect(shouldUseReflector(15, lodDistance, false, hysteresis)).toBe(false)
    })
  })

  describe('境界値', () => {
    it('距離 0 では常に true', () => {
      expect(shouldUseReflector(0, lodDistance, true, hysteresis)).toBe(true)
      expect(shouldUseReflector(0, lodDistance, false, hysteresis)).toBe(true)
    })

    it('lodDistance が 0 の場合は常に false', () => {
      expect(shouldUseReflector(0, 0, true, hysteresis)).toBe(true)
      expect(shouldUseReflector(0.1, 0, true, hysteresis)).toBe(false)
    })
  })
})

describe('shouldUpdateReflection', () => {
  it('interval が 1 以下なら毎フレーム true', () => {
    expect(shouldUpdateReflection(0, 1)).toBe(true)
    expect(shouldUpdateReflection(7, 1)).toBe(true)
    expect(shouldUpdateReflection(7, 0)).toBe(true)
    expect(shouldUpdateReflection(7, -2)).toBe(true)
  })

  it('interval フレームに1回だけ true', () => {
    expect(shouldUpdateReflection(0, 3)).toBe(true)
    expect(shouldUpdateReflection(1, 3)).toBe(false)
    expect(shouldUpdateReflection(2, 3)).toBe(false)
    expect(shouldUpdateReflection(3, 3)).toBe(true)
    expect(shouldUpdateReflection(6, 3)).toBe(true)
  })

  it('小数は切り捨てて扱う', () => {
    expect(shouldUpdateReflection(2, 2.9)).toBe(true)
    expect(shouldUpdateReflection(3, 2.9)).toBe(false)
  })
})
