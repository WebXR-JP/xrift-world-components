import { describe, expect, it } from 'vitest'
import type { SeatSurface } from '../../../../../contexts/SeatContext'
import {
  computeSeatedEyePosition,
  computeSeatedFeetPosition,
  estimateSeatOffsets,
  isPlausibleSeatOffsets,
  moveIntentFromKeys,
  seatContactOffsetFromHipBone,
  toSeatControlInput,
} from '../utils'

const IDENTITY_SURFACE: SeatSurface = {
  position: { x: 1, y: 2, z: 3 },
  quaternion: { x: 0, y: 0, z: 0, w: 1 },
}

describe('moveIntentFromKeys', () => {
  it('W で前進（z が -1）', () => {
    expect(moveIntentFromKeys(new Set(['KeyW']))).toEqual({ x: 0, z: -1 })
  })

  it('D で右（x が +1）', () => {
    expect(moveIntentFromKeys(new Set(['KeyD']))).toEqual({ x: 1, z: 0 })
  })

  it('斜めは正規化される', () => {
    const intent = moveIntentFromKeys(new Set(['KeyW', 'KeyD']))
    expect(intent.x).toBeCloseTo(Math.SQRT1_2)
    expect(intent.z).toBeCloseTo(-Math.SQRT1_2)
  })

  it('何も押していなければゼロ', () => {
    expect(moveIntentFromKeys(new Set())).toEqual({ x: 0, z: 0 })
  })

  it('前後の同時押しは相殺される', () => {
    expect(moveIntentFromKeys(new Set(['KeyW', 'KeyS']))).toEqual({ x: 0, z: 0 })
  })
})

describe('toSeatControlInput', () => {
  it('Z の符号が反転する（W → forward が +1）', () => {
    expect(toSeatControlInput({ x: 0, z: -1 })).toEqual({ forward: 1, right: 0 })
  })

  it('X はそのまま（D → right が +1）', () => {
    const input = toSeatControlInput({ x: 1, z: 0 })
    expect(input.forward).toBeCloseTo(0)
    expect(input.right).toBeCloseTo(1)
  })
})

describe('seatContactOffsetFromHipBone', () => {
  it('腰ボーンからお尻の底ぶんだけ下げる', () => {
    expect(seatContactOffsetFromHipBone(0.45, 1.5)).toBeCloseTo(0.375)
  })
})

describe('estimateSeatOffsets', () => {
  it('DEV の体格で妥当な推定値を返す', () => {
    // DEV_AVATAR_HEIGHT=1.5, DEV_EYE_HEIGHT=1.44 の場合
    const offsets = estimateSeatOffsets(1.5, 1.44)
    expect(offsets.hipOffset).toBeCloseTo(0.375)
    expect(offsets.eyeOffset).toBeCloseTo(1.14)
  })

  it('異常な体格ではフォールバックに切り替える', () => {
    const offsets = estimateSeatOffsets(0.1, 0.05)
    expect(isPlausibleSeatOffsets(offsets)).toBe(false)
    expect(Number.isFinite(offsets.hipOffset)).toBe(true)
    expect(Number.isFinite(offsets.eyeOffset)).toBe(true)
  })
})

describe('isPlausibleSeatOffsets', () => {
  it('目線が腰より上にあれば妥当', () => {
    expect(isPlausibleSeatOffsets({ hipOffset: 0.375, eyeOffset: 1.14 })).toBe(true)
  })

  it('目線が腰以下なら不当', () => {
    expect(isPlausibleSeatOffsets({ hipOffset: 0.5, eyeOffset: 0.4 })).toBe(false)
  })
})

describe('computeSeatedFeetPosition', () => {
  it('傾いていない座席では座面から hipOffset だけ下がる', () => {
    const out = { x: 0, y: 0, z: 0 }
    computeSeatedFeetPosition(IDENTITY_SURFACE, 0.375, out)
    expect(out.x).toBeCloseTo(1)
    expect(out.y).toBeCloseTo(1.625)
    expect(out.z).toBeCloseTo(3)
  })

  it('90° 傾いた座席では座席の下方向に下がる', () => {
    // X 軸まわりに +90°（前に倒れた座席）。座席の -Y（下）はワールドの -Z になる
    const s = Math.SQRT1_2
    const surface: SeatSurface = {
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: s, y: 0, z: 0, w: s },
    }
    const out = { x: 0, y: 0, z: 0 }
    computeSeatedFeetPosition(surface, 1, out)
    expect(out.x).toBeCloseTo(0)
    expect(out.y).toBeCloseTo(0)
    expect(out.z).toBeCloseTo(-1)
  })
})

describe('computeSeatedEyePosition', () => {
  it('傾いていない座席では上と前方にずれる', () => {
    const out = { x: 0, y: 0, z: 0 }
    computeSeatedEyePosition(IDENTITY_SURFACE, 0.765, 0.15, out)
    expect(out.x).toBeCloseTo(1)
    expect(out.y).toBeCloseTo(2.765)
    expect(out.z).toBeCloseTo(2.85)
  })
})
