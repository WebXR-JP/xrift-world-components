import { describe, expect, it } from 'vitest'
import { createDevTeleportStore } from '../store'

describe('createDevTeleportStore', () => {
  it('teleport() で預けた行き先を take() で取り出せる', () => {
    const store = createDevTeleportStore()
    store.contextValue.teleport({ position: [1, 2, 3], yaw: 90 })
    expect(store.take()).toEqual({ position: [1, 2, 3], yaw: 90 })
  })

  it('取り出したら空になる', () => {
    const store = createDevTeleportStore()
    store.contextValue.teleport({ position: [1, 2, 3] })
    store.take()
    expect(store.take()).toBeNull()
  })

  it('取り出す前に何度も呼ばれたら最後の行き先だけが残る', () => {
    const store = createDevTeleportStore()
    store.contextValue.teleport({ position: [1, 0, 0] })
    store.contextValue.teleport({ position: [2, 0, 0] })
    expect(store.take()).toEqual({ position: [2, 0, 0] })
    expect(store.take()).toBeNull()
  })
})
