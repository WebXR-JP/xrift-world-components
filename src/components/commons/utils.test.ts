import { describe, it, expect } from 'vitest'
import { calculateSegments, calculateProgressBar } from './utils'

describe('calculateSegments', () => {
  it('5セグメントで0-100の値を生成', () => {
    const segments = calculateSegments({
      segments: 5,
      width: 10,
      maxValue: 100,
      formatLabel: (value) => `${value}%`,
    })

    expect(segments).toHaveLength(5)
    expect(segments[0].value).toBe(0)
    expect(segments[4].value).toBe(100)
    expect(segments[2].value).toBe(50)
  })

  it('11セグメントで0-1の値を生成（音量バー）', () => {
    const segments = calculateSegments({
      segments: 11,
      width: 3,
      maxValue: 1,
      formatLabel: (value) => `${Math.round(value * 100)}%`,
    })

    expect(segments).toHaveLength(11)
    expect(segments[0].value).toBe(0)
    expect(segments[10].value).toBe(1)
    expect(segments[5].value).toBeCloseTo(0.5)
  })

  it('xPosがセグメントの中央に配置される', () => {
    const segments = calculateSegments({
      segments: 4,
      width: 8,
      maxValue: 1,
      formatLabel: () => '',
    })

    // width=8, segments=4 => segmentWidth=2
    // 中央位置: -4 + 2*(0.5) = -3, -4 + 2*(1.5) = -1, -4 + 2*(2.5) = 1, -4 + 2*(3.5) = 3
    expect(segments[0].xPos).toBe(-3)
    expect(segments[1].xPos).toBe(-1)
    expect(segments[2].xPos).toBe(1)
    expect(segments[3].xPos).toBe(3)
  })

  it('formatLabelが正しく呼ばれる', () => {
    const segments = calculateSegments({
      segments: 3,
      width: 6,
      maxValue: 60,
      formatLabel: (value, index) =>
        index === 0 ? '最初' : `${value}秒`,
    })

    expect(segments[0].label).toBe('最初')
    expect(segments[1].label).toBe('30秒')
    expect(segments[2].label).toBe('60秒')
  })
})

describe('calculateProgressBar', () => {
  it('進捗0のとき幅は0', () => {
    const result = calculateProgressBar(0, 10)
    expect(result.width).toBe(0)
    expect(result.offset).toBe(-5)
  })

  it('進捗1のとき幅は全体', () => {
    const result = calculateProgressBar(1, 10)
    expect(result.width).toBe(10)
    expect(result.offset).toBe(0)
  })

  it('進捗0.5のとき幅は半分', () => {
    const result = calculateProgressBar(0.5, 10)
    expect(result.width).toBe(5)
    expect(result.offset).toBe(-2.5)
  })

  it('進捗が1を超えても1にクランプ', () => {
    const result = calculateProgressBar(1.5, 10)
    expect(result.width).toBe(10)
  })

  it('進捗が0未満でも0にクランプ', () => {
    const result = calculateProgressBar(-0.5, 10)
    expect(result.width).toBe(0)
  })
})
