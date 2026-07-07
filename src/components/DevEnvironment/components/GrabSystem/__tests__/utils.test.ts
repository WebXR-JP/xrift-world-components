import { describe, expect, it } from 'vitest'
import { Object3D, Quaternion, Vector3 } from 'three'
import { GRABBABLE_USER_DATA_KEY } from '../../../../Grabbable/constants'
import { MAX_ANCESTOR_DEPTH, MAX_HOLD_DISTANCE, MIN_HOLD_DISTANCE } from '../constants'
import {
  clampHoldDistance,
  computeHeldPosition,
  distanceBetween,
  findFirstGrabbableId,
  findGrabbableId,
} from '../utils'

describe('clampHoldDistance', () => {
  it('範囲内の距離はそのまま返す', () => {
    expect(clampHoldDistance(3)).toBe(3)
  })

  it('最小距離未満は MIN_HOLD_DISTANCE に丸める', () => {
    expect(clampHoldDistance(0.2)).toBe(MIN_HOLD_DISTANCE)
  })

  it('最大距離超過は MAX_HOLD_DISTANCE に丸める', () => {
    expect(clampHoldDistance(99)).toBe(MAX_HOLD_DISTANCE)
  })
})

describe('distanceBetween', () => {
  it('2点間の距離を返す', () => {
    expect(distanceBetween({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })).toBeCloseTo(5)
  })

  it('同一点は 0 を返す', () => {
    expect(distanceBetween({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBeCloseTo(0)
  })
})

describe('computeHeldPosition', () => {
  it('無回転なら前方（-Z）distance の位置を返す', () => {
    const q = { x: 0, y: 0, z: 0, w: 1 }
    const result = computeHeldPosition({ x: 1, y: 2, z: 3 }, q, 2)
    expect(result.x).toBeCloseTo(1)
    expect(result.y).toBeCloseTo(2)
    expect(result.z).toBeCloseTo(1)
  })

  it('three.js の applyQuaternion と同じ結果になる', () => {
    const quaternions = [
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 4),
      new Quaternion().setFromAxisAngle(new Vector3(1, 2, 3).normalize(), 1.23),
    ]
    const cameraPosition = { x: -2, y: 1.6, z: 5 }
    const distance = 3.5

    for (const q of quaternions) {
      const expected = new Vector3(0, 0, -1)
        .applyQuaternion(q)
        .multiplyScalar(distance)
        .add(new Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z))
      const result = computeHeldPosition(cameraPosition, q, distance)
      expect(result.x).toBeCloseTo(expected.x)
      expect(result.y).toBeCloseTo(expected.y)
      expect(result.z).toBeCloseTo(expected.z)
    }
  })
})

describe('findGrabbableId', () => {
  it('自身の userData から ID を見つける', () => {
    const obj = new Object3D()
    obj.userData[GRABBABLE_USER_DATA_KEY] = 'target-1'
    expect(findGrabbableId(obj)).toBe('target-1')
  })

  it('親を辿って ID を見つける', () => {
    const root = new Object3D()
    root.userData[GRABBABLE_USER_DATA_KEY] = 'target-2'
    const middle = new Object3D()
    const leaf = new Object3D()
    root.add(middle)
    middle.add(leaf)
    expect(findGrabbableId(leaf)).toBe('target-2')
  })

  it('ID が無ければ null を返す', () => {
    expect(findGrabbableId(new Object3D())).toBeNull()
    expect(findGrabbableId(null)).toBeNull()
  })

  it('最大親階層を超える探索はしない', () => {
    const root = new Object3D()
    root.userData[GRABBABLE_USER_DATA_KEY] = 'too-deep'
    let current = root
    for (let i = 0; i < MAX_ANCESTOR_DEPTH; i++) {
      const child = new Object3D()
      current.add(child)
      current = child
    }
    expect(findGrabbableId(current)).toBeNull()
  })
})

describe('findFirstGrabbableId', () => {
  it('手前から順に走査して最初の ID を返す', () => {
    const plain = new Object3D()
    const grabbable = new Object3D()
    grabbable.userData[GRABBABLE_USER_DATA_KEY] = 'first'
    const another = new Object3D()
    another.userData[GRABBABLE_USER_DATA_KEY] = 'second'

    const result = findFirstGrabbableId([
      { object: plain },
      { object: grabbable },
      { object: another },
    ])
    expect(result).toBe('first')
  })

  it('掴める対象が無ければ null を返す', () => {
    expect(findFirstGrabbableId([{ object: new Object3D() }])).toBeNull()
    expect(findFirstGrabbableId([])).toBeNull()
  })
})
