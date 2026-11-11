import { describe, expect, it, vi } from 'vitest'
import type { GrabbableEntry } from '../../../../../contexts/GrabbableContext'
import { MIN_HOLD_DISTANCE } from '../constants'
import { createDevGrabStore } from '../store'

const createEntry = (overrides: Partial<GrabbableEntry> = {}): GrabbableEntry => ({
  setHeldPose: () => {},
  onMove: () => {},
  getTransform: () => ({
    position: { x: 0, y: 1, z: -3 },
    rotation: { x: 0, y: 0.5, z: 0 },
    scale: 2,
  }),
  ...overrides,
})

describe('createDevGrabStore', () => {
  it('登録した対象を掴むと holding になり、掴んだ時点の姿勢を保持する', () => {
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry())

    store.grab('box', { x: 0, y: 1, z: 0 })

    const state = store.getState()
    expect(state.phase).toBe('holding')
    expect(state.grabbedId).toBe('box')
    expect(state.holdDistance).toBeCloseTo(3)
    expect(state.heldRotation).toEqual({ x: 0, y: 0.5, z: 0 })
    expect(state.heldScale).toBe(2)
  })

  it('未登録の ID を掴もうとしても idle のまま', () => {
    const store = createDevGrabStore()
    store.grab('unknown', { x: 0, y: 0, z: 0 })
    expect(store.getState().phase).toBe('idle')
  })

  it('掴み距離は MIN/MAX に丸められる', () => {
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable(
      'near',
      createEntry({
        getTransform: () => ({
          position: { x: 0, y: 0, z: -0.1 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: 1,
        }),
      }),
    )

    store.grab('near', { x: 0, y: 0, z: 0 })
    expect(store.getState().holdDistance).toBe(MIN_HOLD_DISTANCE)
  })

  it('release で最後の heldPosition と掴んだ時点の回転が onMove に渡り idle に戻る', () => {
    const onMove = vi.fn()
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry({ onMove }))

    store.grab('box', { x: 0, y: 1, z: 0 })
    store.updateHeldPosition({ x: 5, y: 2, z: -1 })
    store.release()

    expect(onMove).toHaveBeenCalledWith({
      position: { x: 5, y: 2, z: -1 },
      rotation: { x: 0, y: 0.5, z: 0 },
    })
    expect(store.getState().phase).toBe('idle')
    expect(store.getState().grabbedId).toBeNull()
  })

  it('cancel は onMove を呼ばずに idle に戻る', () => {
    const onMove = vi.fn()
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry({ onMove }))

    store.grab('box', { x: 0, y: 1, z: 0 })
    store.cancel()

    expect(onMove).not.toHaveBeenCalled()
    expect(store.getState().phase).toBe('idle')
  })

  it('holding 中は別の対象を掴めない', () => {
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('a', createEntry())
    store.contextValue.registerGrabbable('b', createEntry())

    store.grab('a', { x: 0, y: 1, z: 0 })
    store.grab('b', { x: 0, y: 1, z: 0 })

    expect(store.getState().grabbedId).toBe('a')
  })

  it('掴み中の対象が登録解除されたら idle に戻る', () => {
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry())

    store.grab('box', { x: 0, y: 1, z: 0 })
    store.contextValue.unregisterGrabbable('box')

    expect(store.getState().phase).toBe('idle')
    expect(store.getState().grabbedId).toBeNull()
  })

  it('ホバー中の対象が登録解除されたら hoveredId が消える', () => {
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry())

    store.setHovered('box')
    store.contextValue.unregisterGrabbable('box')

    expect(store.getState().hoveredId).toBeNull()
  })

  it('subscribeGrabbedId のリスナーが掴み/離しで呼ばれる', () => {
    const listener = vi.fn()
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry())
    const unsubscribe = store.contextValue.subscribeGrabbedId(listener)

    store.grab('box', { x: 0, y: 1, z: 0 })
    expect(listener).toHaveBeenCalledTimes(1)

    store.release()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    store.grab('box', { x: 0, y: 1, z: 0 })
    expect(listener).toHaveBeenCalledTimes(2)
  })

  describe('離した位置の共有', () => {
    it('sync の対象を離すと離した位置を持ち、購読者に知らせる', () => {
      const store = createDevGrabStore()
      store.contextValue.registerGrabbable('box', createEntry())
      const listener = vi.fn()
      store.contextValue.subscribeSyncedTransform?.(listener)

      store.grab('box', { x: 0, y: 1, z: 0 })
      store.updateHeldPosition({ x: 1, y: 2, z: 3 })
      store.release()

      expect(listener).toHaveBeenCalledTimes(1)
      expect(store.contextValue.getSyncedTransform?.('box')).toEqual({
        position: { x: 1, y: 2, z: 3 },
        rotation: { x: 0, y: 0.5, z: 0 },
      })
    })

    it('sync: false の対象は離した位置を持たず、onMove だけ呼ぶ', () => {
      const store = createDevGrabStore()
      const onMove = vi.fn()
      store.contextValue.registerGrabbable('box', createEntry({ sync: false, onMove }))

      store.grab('box', { x: 0, y: 1, z: 0 })
      store.release()

      expect(onMove).toHaveBeenCalledTimes(1)
      expect(store.contextValue.getSyncedTransform?.('box')).toBeNull()
    })

    it('キャンセルでは離した位置を持たない', () => {
      const store = createDevGrabStore()
      store.contextValue.registerGrabbable('box', createEntry())

      store.grab('box', { x: 0, y: 1, z: 0 })
      store.cancel()

      expect(store.contextValue.getSyncedTransform?.('box')).toBeNull()
    })

    it('isHeld は掴んでいる対象だけ true', () => {
      const store = createDevGrabStore()
      store.contextValue.registerGrabbable('box', createEntry())
      store.contextValue.registerGrabbable('ball', createEntry())

      store.grab('box', { x: 0, y: 1, z: 0 })

      expect(store.contextValue.isHeld?.('box')).toBe(true)
      expect(store.contextValue.isHeld?.('ball')).toBe(false)
    })
  })
})

describe('使う（onUseStart / onUseEnd）', () => {
  const setup = () => {
    const onUseStart = vi.fn()
    const onUseEnd = vi.fn()
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('gun', createEntry({ onUseStart, onUseEnd }))
    return { store, onUseStart, onUseEnd }
  }

  it('持っている間に押す・離すと、右手と持っている物の姿勢つきで呼ばれる', () => {
    const { store, onUseStart, onUseEnd } = setup()
    store.grab('gun', { x: 0, y: 1, z: 0 })
    store.updateHeldPosition({ x: 1, y: 2, z: 3 })

    store.useStart()
    store.useEnd()

    expect(onUseStart).toHaveBeenCalledTimes(1)
    expect(onUseStart.mock.calls[0][0]).toEqual({
      hand: 'right',
      transform: { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0.5, z: 0 } },
    })
    expect(onUseEnd).toHaveBeenCalledTimes(1)
  })

  it('持っていなければ押しても呼ばれない', () => {
    const { store, onUseStart, onUseEnd } = setup()
    store.useStart()
    store.useEnd()
    expect(onUseStart).not.toHaveBeenCalled()
    expect(onUseEnd).not.toHaveBeenCalled()
  })

  it('押しっぱなしで二重に始めない', () => {
    const { store, onUseStart } = setup()
    store.grab('gun', { x: 0, y: 1, z: 0 })
    store.useStart()
    store.useStart()
    expect(onUseStart).toHaveBeenCalledTimes(1)
  })

  it('押している途中で置く・キャンセルすると onUseEnd を呼ぶ（押しっぱなしで止まらない）', () => {
    const { store, onUseEnd } = setup()
    store.grab('gun', { x: 0, y: 1, z: 0 })
    store.useStart()
    store.release()
    expect(onUseEnd).toHaveBeenCalledTimes(1)

    store.grab('gun', { x: 0, y: 1, z: 0 })
    store.useStart()
    store.cancel()
    expect(onUseEnd).toHaveBeenCalledTimes(2)
    expect(store.getState().isUsing).toBe(false)
  })
})
