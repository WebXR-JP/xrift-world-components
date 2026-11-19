import { describe, expect, it } from 'vitest'
import { Matrix4, Quaternion, Vector3 } from 'three'
import {
  applyDeadzone,
  combineMoveIntent,
  nextSnapTurn,
  normalizeAngle,
  rayFromPose,
  readStick,
} from '../utils'

describe('applyDeadzone', () => {
  it('デッドゾーン以下は 0 にする', () => {
    expect(applyDeadzone(0.01, 0.02)).toBe(0)
    expect(applyDeadzone(-0.01, 0.02)).toBe(0)
  })
  it('超えたらそのまま返す', () => {
    expect(applyDeadzone(0.5, 0.02)).toBe(0.5)
    expect(applyDeadzone(-0.5, 0.02)).toBe(-0.5)
  })
})

describe('readStick', () => {
  it('xr-standard のスティックの軸（2・3番）を読む', () => {
    expect(readStick([0, 0, 0.6, -0.8])).toEqual({ x: 0.6, y: -0.8 })
  })
  it('軸が無いコントローラーでは 0', () => {
    expect(readStick([])).toEqual({ x: 0, y: 0 })
  })
})

describe('nextSnapTurn', () => {
  it('右へ大きく倒したら右を向く（yaw が減る）', () => {
    expect(nextSnapTurn(0.9, { armed: true })).toEqual({ turn: -1, state: { armed: false } })
  })
  it('左へ大きく倒したら左を向く', () => {
    expect(nextSnapTurn(-0.9, { armed: true })).toEqual({ turn: 1, state: { armed: false } })
  })
  it('倒したままでは続けて回らない', () => {
    expect(nextSnapTurn(0.9, { armed: false }).turn).toBe(0)
  })
  it('中央付近まで戻したら次を受け付ける', () => {
    expect(nextSnapTurn(0.1, { armed: false })).toEqual({ turn: 0, state: { armed: true } })
  })
  it('浅く倒しただけでは回らない', () => {
    expect(nextSnapTurn(0.5, { armed: true })).toEqual({ turn: 0, state: { armed: true } })
  })
})

describe('combineMoveIntent', () => {
  it('長さ 1 以下はそのまま（スティックを浅く倒せば遅い）', () => {
    expect(combineMoveIntent(0.5, 0)).toEqual({ forward: 0.5, strafe: 0 })
  })
  it('斜めのキー入力は長さ 1 に丸める', () => {
    const { forward, strafe } = combineMoveIntent(1, 1)
    expect(forward).toBeCloseTo(Math.SQRT1_2)
    expect(strafe).toBeCloseTo(Math.SQRT1_2)
  })
})

describe('rayFromPose', () => {
  it('XROrigin の位置と回転を足してワールドのレイにする', () => {
    const origin = new Matrix4().compose(
      new Vector3(10, 0, 0),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
      new Vector3(1, 1, 1),
    )
    const pose = new Matrix4().makeTranslation(0, 1, -1)
    const position = new Vector3()
    const direction = new Vector3()
    rayFromPose(pose, origin, position, direction, new Matrix4())
    // origin で 90° 左を向いているので、ローカルの -Z（前）はワールドの -X
    expect(position.x).toBeCloseTo(9)
    expect(position.y).toBeCloseTo(1)
    expect(position.z).toBeCloseTo(0)
    expect(direction.x).toBeCloseTo(-1)
    expect(direction.z).toBeCloseTo(0)
  })
})

describe('normalizeAngle', () => {
  it('-π〜π に収める', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI)
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2)
  })
})
