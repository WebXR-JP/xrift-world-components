import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Euler, type Object3D, Quaternion, Vector3 } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { LAYERS } from '../../../constants/layers'
import {
  type GrabbableContextValue,
  type GrabbableEntry,
  GrabbableProvider,
  type GrabResultTransform,
} from '../../../contexts/GrabbableContext'
import { GRABBABLE_USER_DATA_KEY } from '../constants'
import { Grabbable } from '..'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const { act } = ReactThreeTestRenderer

const INITIAL = {
  position: { x: 1, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
}

/** テスト用のプラットフォーム。持っている人と離した位置を手で切り替える */
function createPlatform() {
  const entries = new Map<string, GrabbableEntry>()
  const listeners = new Set<() => void>()
  const synced = new Map<string, GrabResultTransform>()
  let mine: string | null = null
  let other: string | null = null
  const notify = () => {
    for (const listener of listeners) listener()
  }

  const implementation: GrabbableContextValue = {
    registerGrabbable: (id, entry) => {
      entries.set(id, entry)
    },
    unregisterGrabbable: (id) => {
      entries.delete(id)
    },
    getGrabbedId: () => mine,
    subscribeGrabbedId: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    isHeld: (id) => mine === id || other === id,
    isHeldByMe: (id) => mine === id,
    getSyncedTransform: (id) => synced.get(id) ?? null,
    subscribeSyncedTransform: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  return {
    implementation,
    entry: (id: string) => entries.get(id),
    holdByMe: (id: string | null) => {
      mine = id
      notify()
    },
    holdByOther: (id: string | null) => {
      other = id
      notify()
    },
    /** 置いた（離した位置を共有してから手から離す） */
    placeByMe: (id: string, transform: GrabResultTransform) => {
      synced.set(id, transform)
      mine = null
      notify()
    },
  }
}

type Platform = ReturnType<typeof createPlatform>

interface RenderOptions {
  onGrab?: () => void
  onRelease?: () => void
}

/** 変形された親（x+10・y 軸 90°）の下に置いて描く */
async function renderGrabbable(platform: Platform, options: RenderOptions = {}) {
  const renderer = await ReactThreeTestRenderer.create(
    <GrabbableProvider implementation={platform.implementation}>
      <group position={[10, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Grabbable id="box" transform={INITIAL} {...options}>
          <mesh name="button" />
        </Grabbable>
      </group>
    </GrabbableProvider>,
  )
  const root = findGrabbableRoot(renderer.scene.instance)
  return { renderer, root, button: root.getObjectByName('button') as Object3D }
}

function findGrabbableRoot(scene: Object3D): Object3D {
  let found: Object3D | undefined
  scene.traverse((obj) => {
    if (obj.userData[GRABBABLE_USER_DATA_KEY] === 'box') found = obj
  })
  if (!found) throw new Error('Grabbable のルートが見つからない')
  return found
}

function worldPosition(object: Object3D): Vector3 {
  object.updateWorldMatrix(true, false)
  return object.getWorldPosition(new Vector3())
}

const HAND_QUATERNION = new Quaternion().setFromEuler(new Euler(0, 0.3, 0))

describe('Grabbable', () => {
  it('持っている間は本体そのものを手元の姿勢（ワールド座標）へ動かし、隠さない', async () => {
    const platform = createPlatform()
    const { root } = await renderGrabbable(platform)

    await act(async () => platform.holdByMe('box'))
    platform.entry('box')?.setHeldPose({ x: 0, y: 1.5, z: -2 }, HAND_QUATERNION, 1)

    const position = worldPosition(root)
    expect(position.x).toBeCloseTo(0)
    expect(position.y).toBeCloseTo(1.5)
    expect(position.z).toBeCloseTo(-2)
    expect(root.visible).toBe(true)
  })

  it('持つのをやめたら（置かずに）元の場所へ戻る', async () => {
    const platform = createPlatform()
    const { root } = await renderGrabbable(platform)
    const before = worldPosition(root)

    await act(async () => platform.holdByMe('box'))
    platform.entry('box')?.setHeldPose({ x: 0, y: 1.5, z: -2 }, HAND_QUATERNION, 1)
    await act(async () => platform.holdByMe(null))

    const after = worldPosition(root)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
    expect(after.z).toBeCloseTo(before.z)
  })

  it('置いたら、共有された離した位置に留まる', async () => {
    const platform = createPlatform()
    const { root } = await renderGrabbable(platform)

    await act(async () => platform.holdByMe('box'))
    platform.entry('box')?.setHeldPose({ x: 0, y: 1.5, z: -2 }, HAND_QUATERNION, 1)
    await act(async () =>
      platform.placeByMe('box', {
        position: { x: 0, y: 1.5, z: -2 },
        rotation: { x: 0, y: 0.3, z: 0 },
      }),
    )

    const position = worldPosition(root)
    expect(position.x).toBeCloseTo(0)
    expect(position.y).toBeCloseTo(1.5)
    expect(position.z).toBeCloseTo(-2)
  })

  it('持ち上げた・離したときに onGrab / onRelease を呼ぶ（自分かどうか付き）', async () => {
    const platform = createPlatform()
    const onGrab = vi.fn()
    const onRelease = vi.fn()
    await renderGrabbable(platform, { onGrab, onRelease })

    await act(async () => platform.holdByMe('box'))
    expect(onGrab).toHaveBeenLastCalledWith({ isMine: true })
    await act(async () => platform.holdByMe(null))
    expect(onRelease).toHaveBeenLastCalledWith({ isMine: true })

    await act(async () => platform.holdByOther('box'))
    expect(onGrab).toHaveBeenLastCalledWith({ isMine: false })
    await act(async () => platform.holdByOther(null))
    expect(onRelease).toHaveBeenLastCalledWith({ isMine: false })
    expect(onGrab).toHaveBeenCalledTimes(2)
    expect(onRelease).toHaveBeenCalledTimes(2)
  })

  it('持たれたまま外されたら onRelease を呼ぶ', async () => {
    const platform = createPlatform()
    const onRelease = vi.fn()
    const { renderer } = await renderGrabbable(platform, { onRelease })

    await act(async () => platform.holdByOther('box'))
    await renderer.unmount()

    expect(onRelease).toHaveBeenCalledWith({ isMine: false })
  })

  it('持っている間は掴む・押す対象から外し、離したら戻す', async () => {
    const platform = createPlatform()
    const { root, button } = await renderGrabbable(platform)
    button.layers.enable(LAYERS.INTERACTABLE)

    await act(async () => platform.holdByMe('box'))
    platform.entry('box')?.setHeldPose({ x: 0, y: 1.5, z: -2 }, HAND_QUATERNION, 1)
    expect(root.layers.isEnabled(LAYERS.GRABBABLE)).toBe(false)
    expect(button.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(false)

    await act(async () => platform.holdByMe(null))
    expect(root.layers.isEnabled(LAYERS.GRABBABLE)).toBe(true)
    expect(button.layers.isEnabled(LAYERS.INTERACTABLE)).toBe(true)
  })
})
