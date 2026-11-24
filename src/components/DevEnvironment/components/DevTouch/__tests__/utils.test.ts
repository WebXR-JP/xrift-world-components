import { describe, expect, it } from 'vitest'
import { applyTouchLook, calculateJoystickPosition, normalizeJoystickInput } from '../utils'

describe('calculateJoystickPosition', () => {
  it('円の中ならそのまま', () => {
    expect(calculateJoystickPosition(110, 120, 100, 100, 40)).toEqual({ x: 10, y: 20 })
  })
  it('外へ出たら円の縁で止める', () => {
    const p = calculateJoystickPosition(200, 100, 100, 100, 40)
    expect(p.x).toBeCloseTo(40)
    expect(p.y).toBeCloseTo(0)
  })
})

describe('normalizeJoystickInput', () => {
  it('遊びより小さければ 0', () => {
    expect(normalizeJoystickInput(0.05, 0, 40, 0.1)).toEqual({ x: 0, y: 0 })
  })
  it('縁まで倒せば 1、上へ倒すと y が負（前）', () => {
    expect(normalizeJoystickInput(0, -40, 40, 0.1)).toEqual({ x: 0, y: -1 })
    expect(normalizeJoystickInput(20, 0, 40, 0.1)).toEqual({ x: 0.5, y: 0 })
  })
})

describe('applyTouchLook', () => {
  it('右へなぞると右を向く（yaw が減る）、上へなぞると見上げる', () => {
    const r = applyTouchLook(0, 0, 100, -50, 0.004, Math.PI * 0.4)
    expect(r.yaw).toBeCloseTo(-0.4)
    expect(r.pitch).toBeCloseTo(0.2)
  })
  it('見上げ・見下ろしは上限で止める', () => {
    expect(applyTouchLook(0, 0, 0, -10000, 0.004, 1).pitch).toBe(1)
    expect(applyTouchLook(0, 0, 0, 10000, 0.004, 1).pitch).toBe(-1)
  })
})
