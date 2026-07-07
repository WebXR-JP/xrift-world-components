import { describe, expect, it, vi } from 'vitest'
import type { GrabbableEntry } from '../../../../../contexts/GrabbableContext'
import { MAX_HOLD_DISTANCE, MIN_HOLD_DISTANCE } from '../constants'
import { createDevGrabStore } from '../store'

const createEntry = (overrides: Partial<GrabbableEntry> = {}): GrabbableEntry => ({
  renderGhost: () => null,
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

  it('adjustHoldDistance は holding 中のみ動作し clamp される', () => {
    const store = createDevGrabStore()
    store.contextValue.registerGrabbable('box', createEntry())

    store.adjustHoldDistance(1)
    expect(store.getState().holdDistance).toBe(0)

    store.grab('box', { x: 0, y: 1, z: 0 })
    store.adjustHoldDistance(100)
    expect(store.getState().holdDistance).toBe(MAX_HOLD_DISTANCE)
    store.adjustHoldDistance(-100)
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
})
