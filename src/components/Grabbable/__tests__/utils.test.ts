import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { Group, Mesh } from 'three'
import { LAYERS } from '../../../constants/layers'
import {
  applyWorldPose,
  decomposeWorldTransform,
  holdTransitions,
  nextPoseSource,
  poseKey,
  restoreHeldLayers,
  STRIP_LAYERS_INTERVAL,
  shouldStripLayers,
  stripHeldLayers,
  worldToLocalTransform,
} from '../utils'

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

describe('nextPoseSource', () => {
  it('共有している位置が無ければ transform', () => {
    expect(nextPoseSource('synced', false, true, false)).toBe('transform')
  })

  it('誰かが離した（共有している位置が変わった）ら共有している位置', () => {
    expect(nextPoseSource('transform', true, true, false)).toBe('synced')
  })

  it('ワールドが transform を変えたら transform（初期位置に戻すボタンなど）', () => {
    expect(nextPoseSource('synced', true, false, true)).toBe('transform')
  })

  it('両方変わったら共有している位置', () => {
    expect(nextPoseSource('transform', true, true, true)).toBe('synced')
  })

  it('どちらも変わらなければ前回のまま', () => {
    expect(nextPoseSource('transform', true, false, false)).toBe('transform')
    expect(nextPoseSource('synced', true, false, false)).toBe('synced')
  })
})

describe('poseKey', () => {
  it('値が同じなら別のオブジェクトでも同じキー', () => {
    const a = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0.5, z: 0 } }
    const b = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0.5, z: 0 } }
    expect(poseKey(a)).toBe(poseKey(b))
  })

  it('値が違えば違うキー', () => {
    const a = { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0 } }
    const b = { position: { x: 1, y: 2, z: 4 }, rotation: { x: 0, y: 0, z: 0 } }
    expect(poseKey(a)).not.toBe(poseKey(b))
  })
})

describe('applyWorldPose', () => {
  const quaternion = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0))

  it('親が無ければワールド姿勢をそのまま当てる', () => {
    const object = new Group()
    applyWorldPose(object, { x: 1, y: 2, z: 3 }, quaternion, 2)
    expect(object.position.x).toBeCloseTo(1)
    expect(object.position.y).toBeCloseTo(2)
    expect(object.position.z).toBeCloseTo(3)
    expect(object.quaternion.angleTo(quaternion)).toBeCloseTo(0)
    expect(object.scale.x).toBeCloseTo(2)
  })

  it('変形された親の下でも、ワールドで渡した姿勢になる', () => {
    const parent = new Group()
    parent.position.set(10, 0, 0)
    parent.rotation.set(0, Math.PI / 4, 0)
    parent.scale.setScalar(2)
    const object = new Group()
    parent.add(object)

    applyWorldPose(object, { x: 1, y: 2, z: 3 }, quaternion, 1)
    object.updateWorldMatrix(true, false)
    const world = decomposeWorldTransform(object.matrixWorld)
    expect(world.position.x).toBeCloseTo(1)
    expect(world.position.y).toBeCloseTo(2)
    expect(world.position.z).toBeCloseTo(3)
    expect(world.scale).toBeCloseTo(1)
    expect(object.scale.x).toBeCloseTo(0.5)
    const worldQuaternion = new Quaternion()
    object.getWorldQuaternion(worldQuaternion)
    expect(worldQuaternion.angleTo(quaternion)).toBeCloseTo(0)
  })
})

describe('holdTransitions', () => {
  it('変わらなければ何も呼ばない', () => {
    expect(holdTransitions('none', 'none')).toEqual([])
    expect(holdTransitions('mine', 'mine')).toEqual([])
  })

  it('持ち上げたら grab、離したら release（自分かどうかを付ける）', () => {
    expect(holdTransitions('none', 'mine')).toEqual([{ type: 'grab', isMine: true }])
    expect(holdTransitions('none', 'other')).toEqual([{ type: 'grab', isMine: false }])
    expect(holdTransitions('mine', 'none')).toEqual([{ type: 'release', isMine: true }])
    expect(holdTransitions('other', 'none')).toEqual([{ type: 'release', isMine: false }])
  })

  it('持ち主が入れ替わったら、離してから持ち上げたことにする', () => {
    expect(holdTransitions('other', 'mine')).toEqual([
      { type: 'release', isMine: false },
      { type: 'grab', isMine: true },
    ])
  })
})

describe('stripHeldLayers / restoreHeldLayers', () => {
  const setup = () => {
    const group = new Group()
    const button = new Mesh()
    const body = new Mesh()
    group.add(button, body)
    for (const obj of [group, button, body]) obj.layers.enable(LAYERS.GRABBABLE)
    button.layers.enable(LAYERS.INTERACTABLE)
    return { group, button, body }
  }

  it('持っている間は GRABBABLE・INTERACTABLE を外す', () => {
    const { group, button, body } = setup()
    stripHeldLayers(group)
    for (const obj of [group, button, body]) expect(obj.layers.isEnabled(LAYERS.GRABBABLE)).toBe(false)
    expect(button.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(false)
  })

  it('離したら、外した INTERACTABLE だけを戻す（もともと無かった子には付けない）', () => {
    const { group, button, body } = setup()
    stripHeldLayers(group)
    restoreHeldLayers(group, true)
    for (const obj of [group, button, body]) expect(obj.layers.isEnabled(LAYERS.GRABBABLE)).toBe(true)
    expect(button.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(true)
    expect(body.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(false)
  })

  it('掴めなくしてある（enabled=false）なら GRABBABLE は戻さない', () => {
    const { group, button } = setup()
    stripHeldLayers(group)
    restoreHeldLayers(group, false)
    expect(group.layers.isEnabled(LAYERS.GRABBABLE)).toBe(false)
    expect(button.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(true)
  })

  it('戻したら印を消すので、2回目の戻しで INTERACTABLE を付け直さない', () => {
    const { group, button } = setup()
    stripHeldLayers(group)
    restoreHeldLayers(group, true)
    button.layers.disable(LAYERS.INTERACTABLE)
    restoreHeldLayers(group, true)
    expect(button.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(false)
  })
})

describe('shouldStripLayers', () => {
  it('持ち始めは必ず外し、あとは間隔ごとに外し直す', () => {
    expect(shouldStripLayers(0)).toBe(true)
    expect(shouldStripLayers(1)).toBe(false)
    expect(shouldStripLayers(STRIP_LAYERS_INTERVAL - 1)).toBe(false)
    expect(shouldStripLayers(STRIP_LAYERS_INTERVAL)).toBe(true)
  })
})
