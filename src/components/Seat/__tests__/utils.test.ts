import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import type { SeatSurface } from '../../../contexts/SeatContext'
import { computeExitPosition, decomposeSeatSurface, diffSeatOccupancy, seatYaw } from '../utils'

const matrixOf = (position: Vector3, euler: Euler, scale = 1) =>
  new Matrix4().compose(
    position,
    new Quaternion().setFromEuler(euler),
    new Vector3(scale, scale, scale),
  )

const surfaceOf = (euler: Euler, position = new Vector3()): SeatSurface =>
  decomposeSeatSurface(matrixOf(position, euler))

describe('decomposeSeatSurface', () => {
  it('単位行列は原点・無回転', () => {
    const s = decomposeSeatSurface(new Matrix4())
    expect(s.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(s.quaternion.w).toBeCloseTo(1)
  })

  it('平行移動と回転を取り出し、スケールは捨てる', () => {
    const s = decomposeSeatSurface(matrixOf(new Vector3(1, 2, 3), new Euler(0, Math.PI / 2, 0), 2))
    expect(s.position.x).toBeCloseTo(1)
    expect(s.position.y).toBeCloseTo(2)
    expect(s.position.z).toBeCloseTo(3)
    // Y軸90°回転のクォータニオン
    expect(s.quaternion.y).toBeCloseTo(Math.SQRT1_2)
    expect(s.quaternion.w).toBeCloseTo(Math.SQRT1_2)
  })

  it('親の変換が掛かった行列（傾き＋移動）もそのまま座面になる', () => {
    const parent = matrixOf(new Vector3(0, 5, 0), new Euler(0, 0, Math.PI / 6))
    const local = matrixOf(new Vector3(0, 0.45, 0), new Euler())
    const s = decomposeSeatSurface(parent.clone().multiply(local))
    // 親の傾き（Z軸30°）で座面の位置も回る
    expect(s.position.x).toBeCloseTo(-0.45 * Math.sin(Math.PI / 6))
    expect(s.position.y).toBeCloseTo(5 + 0.45 * Math.cos(Math.PI / 6))
    expect(s.quaternion.z).toBeCloseTo(Math.sin(Math.PI / 12))
  })
})

describe('seatYaw', () => {
  it('無回転は yaw=0（前方 -Z）', () => {
    expect(seatYaw(surfaceOf(new Euler()))).toBeCloseTo(0)
  })

  it('Y軸回転はそのまま yaw', () => {
    expect(seatYaw(surfaceOf(new Euler(0, Math.PI / 2, 0)))).toBeCloseTo(Math.PI / 2)
    expect(seatYaw(surfaceOf(new Euler(0, -Math.PI / 3, 0)))).toBeCloseTo(-Math.PI / 3)
  })

  it('傾いていても水平方向の向きが出る（バンク＋yaw）', () => {
    // YXZ: yaw 90° → pitch 20° → roll 30°
    expect(seatYaw(surfaceOf(new Euler(Math.PI / 9, Math.PI / 2, Math.PI / 6, 'YXZ')))).toBeCloseTo(
      Math.PI / 2,
    )
  })

  it('真上を向いている（水平成分なし）ときは 0', () => {
    expect(seatYaw(surfaceOf(new Euler(Math.PI / 2, 0, 0)))).toBe(0)
  })
})

describe('computeExitPosition', () => {
  it('既定は座面の高さから前（-Z）へ 0.6m', () => {
    const exit = computeExitPosition(surfaceOf(new Euler(), new Vector3(1, 0.45, 2)))
    expect(exit.x).toBeCloseTo(1)
    expect(exit.y).toBeCloseTo(0.45)
    expect(exit.z).toBeCloseTo(2 - 0.6)
  })

  it('forward/right は yaw で回る（yaw=90° で前方は -X、右は -Z）', () => {
    const exit = computeExitPosition(surfaceOf(new Euler(0, Math.PI / 2, 0)), {
      forward: 1,
      right: 0.5,
    })
    expect(exit.x).toBeCloseTo(-1)
    expect(exit.z).toBeCloseTo(-0.5)
  })

  it('up はワールド上方向に足す（座席が傾いていても真上）', () => {
    const exit = computeExitPosition(surfaceOf(new Euler(0, 0, Math.PI / 4), new Vector3(0, 1, 0)), {
      forward: 0,
      up: -1,
    })
    expect(exit.x).toBeCloseTo(0)
    expect(exit.y).toBeCloseTo(0)
    expect(exit.z).toBeCloseTo(0)
  })

  it('部分指定は残りを既定値で埋める', () => {
    const exit = computeExitPosition(surfaceOf(new Euler()), { up: 0.2 })
    expect(exit.z).toBeCloseTo(-0.6)
    expect(exit.y).toBeCloseTo(0.2)
  })
})

describe('diffSeatOccupancy', () => {
  it('空席に座ったら enter だけ', () => {
    const { leave, enter } = diffSeatOccupancy(null, 'alice', 'me')
    expect(leave).toBeUndefined()
    expect(enter).toEqual({ id: 'alice', isLocalUser: false })
  })

  it('降りたら leave だけ', () => {
    const { leave, enter } = diffSeatOccupancy('alice', null, 'me')
    expect(leave).toEqual({ id: 'alice', isLocalUser: false })
    expect(enter).toBeUndefined()
  })

  it('席を譲ったら leave と enter の両方を返す', () => {
    const { leave, enter } = diffSeatOccupancy('alice', 'bob', 'me')
    expect(leave).toEqual({ id: 'alice', isLocalUser: false })
    expect(enter).toEqual({ id: 'bob', isLocalUser: false })
  })

  it('自分なら isLocalUser が true', () => {
    expect(diffSeatOccupancy(null, 'me', 'me').enter).toEqual({ id: 'me', isLocalUser: true })
    expect(diffSeatOccupancy('me', null, 'me').leave).toEqual({ id: 'me', isLocalUser: true })
  })

  it('変化がなければ何も返さない（同じ占有者で呼ばれ続けても通知しない）', () => {
    expect(diffSeatOccupancy('alice', 'alice', 'me')).toEqual({})
    expect(diffSeatOccupancy(null, null, 'me')).toEqual({})
  })

  it('ローカルユーザーIDが未確定なら isLocalUser は false', () => {
    expect(diffSeatOccupancy(null, 'alice', null).enter).toEqual({
      id: 'alice',
      isLocalUser: false,
    })
  })
})
