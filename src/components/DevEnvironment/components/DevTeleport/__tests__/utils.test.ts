import { describe, expect, it } from 'vitest'
import { toDevPlacementPose } from '../utils'

describe('toDevPlacementPose', () => {
  it('足元の位置をカプセルの中心まで持ち上げる', () => {
    const pose = toDevPlacementPose([1, 2, 3], undefined, 0.8)
    expect(pose.bodyPosition.x).toBe(1)
    expect(pose.bodyPosition.y).toBeCloseTo(2.8)
    expect(pose.bodyPosition.z).toBe(3)
  })

  it('yaw を度数法からラジアンにする', () => {
    expect(toDevPlacementPose([0, 0, 0], 180, 0).yaw).toBeCloseTo(Math.PI)
    expect(toDevPlacementPose([0, 0, 0], 90, 0).yaw).toBeCloseTo(Math.PI / 2)
  })

  it('yaw が 0 のときは 0（省略と区別する）', () => {
    expect(toDevPlacementPose([0, 0, 0], 0, 0).yaw).toBe(0)
  })

  it('yaw を省略したら undefined（いまの方角のまま）', () => {
    expect(toDevPlacementPose([0, 0, 0], undefined, 0).yaw).toBeUndefined()
  })
})
