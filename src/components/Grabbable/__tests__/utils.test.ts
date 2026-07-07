import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { decomposeWorldTransform, worldToLocalTransform } from '../utils'

describe('decomposeWorldTransform', () => {
  it('単位行列は原点・無回転・スケール1', () => {
    const t = decomposeWorldTransform(new Matrix4())
    expect(t.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(t.scale).toBeCloseTo(1)
  })

  it('平行移動＋スケールを分解できる', () => {
    const m = new Matrix4().compose(
      new Vector3(1, 2, 3),
      new Quaternion(),
      new Vector3(2, 2, 2),
    )
    const t = decomposeWorldTransform(m)
    expect(t.position.x).toBeCloseTo(1)
    expect(t.position.y).toBeCloseTo(2)
    expect(t.position.z).toBeCloseTo(3)
    expect(t.scale).toBeCloseTo(2)
  })
})

describe('worldToLocalTransform', () => {
  it('親が単位行列ならワールド＝ローカル（そのまま返る）', () => {
    const local = worldToLocalTransform(
      { x: 1, y: 5, z: -2 },
      { x: 0, y: 0, z: 0 },
      new Matrix4(),
    )
    expect(local.position.x).toBeCloseTo(1)
    expect(local.position.y).toBeCloseTo(5)
    expect(local.position.z).toBeCloseTo(-2)
  })

  it('親が平行移動している場合、その分を差し引く（-4 オフセットの再現）', () => {
    // 親が y=-4 に平行移動 → ワールド y=-3 はローカル y=1
    const parent = new Matrix4().makeTranslation(0, -4, 0)
    const local = worldToLocalTransform({ x: 0, y: -3, z: 1 }, { x: 0, y: 0, z: 0 }, parent)
    expect(local.position.x).toBeCloseTo(0)
    expect(local.position.y).toBeCloseTo(1)
    expect(local.position.z).toBeCloseTo(1)
  })

  it('ローカル→ワールド→ローカルで往復一致する（回転付き親）', () => {
    const parent = new Matrix4().compose(
      new Vector3(2, -4, 1),
      new Quaternion().setFromEuler(new Euler(0, Math.PI / 3, 0)),
      new Vector3(1, 1, 1),
    )
    // 既知のローカル姿勢
    const localPos = new Vector3(0.5, 1.2, -0.3)
    const localEuler = new Euler(0.1, 0.4, -0.2)
    const localQuat = new Quaternion().setFromEuler(localEuler)
    // ローカル→ワールド
    const worldMatrix = new Matrix4()
      .copy(parent)
      .multiply(new Matrix4().compose(localPos, localQuat, new Vector3(1, 1, 1)))
    const wp = new Vector3()
    const wq = new Quaternion()
    const ws = new Vector3()
    worldMatrix.decompose(wp, wq, ws)
    const worldEuler = new Euler().setFromQuaternion(wq)

    // ワールド→ローカルで元に戻る
    const back = worldToLocalTransform(
      { x: wp.x, y: wp.y, z: wp.z },
      { x: worldEuler.x, y: worldEuler.y, z: worldEuler.z },
      parent,
    )
    expect(back.position.x).toBeCloseTo(localPos.x)
    expect(back.position.y).toBeCloseTo(localPos.y)
    expect(back.position.z).toBeCloseTo(localPos.z)
    // 回転はクォータニオン一致で確認
    const backQuat = new Quaternion().setFromEuler(
      new Euler(back.rotation.x, back.rotation.y, back.rotation.z),
    )
    expect(Math.abs(backQuat.dot(localQuat))).toBeCloseTo(1)
  })
})
