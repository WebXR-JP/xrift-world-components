import { describe, expect, it } from 'vitest'
import { remotePoseLerpFactor } from '../utils'

describe('同期されてきた姿勢へ寄せる割合', () => {
  it('フレーム時間に比例する（届く間隔が変わっても寄る速さが変わらない）', () => {
    const short = remotePoseLerpFactor(1 / 120, 0.1)
    const long = remotePoseLerpFactor(1 / 60, 0.1)
    expect(long).toBeCloseTo(short * 2)
  })

  it('1 を超えない（タブ復帰などで delta が大きくても飛び越えない）', () => {
    expect(remotePoseLerpFactor(5, 0.1)).toBe(1)
  })

  it('1 フレームで当てきらない＝補間が効いている（20Hz のカクつきを均す）', () => {
    const factor = remotePoseLerpFactor(1 / 60, 0.1)
    expect(factor).toBeGreaterThan(0)
    expect(factor).toBeLessThan(1)
  })

  it('大きく離れていたら補間せず飛ばす（初回受信・リスポーン）', () => {
    expect(remotePoseLerpFactor(1 / 60, 50)).toBe(1)
  })

  it('delta が 0 でも負の割合にならない', () => {
    expect(remotePoseLerpFactor(0, 0.1)).toBe(0)
  })
})
