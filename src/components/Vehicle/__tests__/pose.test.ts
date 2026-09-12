import { Euler, Group, Quaternion } from 'three'
import { describe, expect, it } from 'vitest'
import type { VehiclePose } from '../../../contexts/SeatContext'

/**
 * <Vehicle> の getPose / applyPose と同じ読み書きを、Group に対して行う。
 * コンポーネントを描画せずに「Group ⇄ VehiclePose の往復で姿勢が保たれるか」を見る
 */
const readPose = (group: Group): VehiclePose => ({
  position: { x: group.position.x, y: group.position.y, z: group.position.z },
  quaternion: {
    x: group.quaternion.x,
    y: group.quaternion.y,
    z: group.quaternion.z,
    w: group.quaternion.w,
  },
})

const writePose = (group: Group, pose: VehiclePose) => {
  group.position.set(pose.position.x, pose.position.y, pose.position.z)
  group.quaternion.set(pose.quaternion.x, pose.quaternion.y, pose.quaternion.z, pose.quaternion.w)
}

describe('乗り物の姿勢の受け渡し', () => {
  it('位置と向きが往復しても変わらない', () => {
    const source = new Group()
    source.position.set(1, 2, 3)
    source.quaternion.setFromEuler(new Euler(0, Math.PI / 3, 0))

    const target = new Group()
    writePose(target, readPose(source))

    expect(target.position.toArray()).toEqual([1, 2, 3])
    expect(target.quaternion.angleTo(source.quaternion)).toBeCloseTo(0)
  })

  it('傾き（坂道）も落ちない。yaw に落とすと消えてしまう成分を保つ', () => {
    const source = new Group()
    // 進行方向を向いたまま前傾＋バンク
    source.quaternion.setFromEuler(new Euler(Math.PI / 9, Math.PI / 4, Math.PI / 12, 'YXZ'))

    const target = new Group()
    writePose(target, readPose(source))

    expect(target.quaternion.angleTo(source.quaternion)).toBeCloseTo(0)
    // 傾きの成分（X/Z）が残っている＝yaw だけに落ちていない
    expect(Math.abs(target.quaternion.x) + Math.abs(target.quaternion.z)).toBeGreaterThan(0.01)
  })
})

describe('作者が書く操作（three.js の Group をそのまま渡す理由）', () => {
  it('translateZ は車体の前方へ進む。傾いていれば坂に沿う', () => {
    const vehicle = new Group()
    // 30°前傾（X軸まわり）
    vehicle.quaternion.setFromEuler(new Euler(Math.PI / 6, 0, 0))
    vehicle.translateZ(-1)

    // 前方 -Z へ 1m 進むが、前傾しているぶん Y も下がる
    expect(vehicle.position.z).toBeCloseTo(-Math.cos(Math.PI / 6))
    expect(vehicle.position.y).toBeCloseTo(Math.sin(Math.PI / 6))
  })

  it('rotateY は今の向きから相対に回る（旋回を足していける）', () => {
    const vehicle = new Group()
    vehicle.rotateY(Math.PI / 4)
    vehicle.rotateY(Math.PI / 4)
    expect(vehicle.quaternion.angleTo(new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)))).toBeCloseTo(0)
  })
})
