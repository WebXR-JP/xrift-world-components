/**
 * @vitest-environment jsdom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  type InstanceEvent,
  type UserJoinedEventData,
  type UserLeftEventData,
  useInstanceEvent,
} from '../../hooks/useInstanceEvent'
import {
  createDefaultInstanceEventImplementation,
  InstanceEventProvider,
  type InstanceEventContextValue,
} from '../InstanceEventContext'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('createDefaultInstanceEventImplementation', () => {
  it('送った本人には届かない（本番と同じ）', () => {
    const impl = createDefaultInstanceEventImplementation()
    const callback = vi.fn()

    impl.subscribe('reaction', callback)
    impl.emit('reaction', { emoji: '👍' })

    expect(callback).not.toHaveBeenCalled()
  })
})

describe('useInstanceEvent', () => {
  let container: HTMLDivElement
  let root: Root
  let deliver: (eventName: string, data: unknown) => void
  let impl: InstanceEventContextValue

  beforeEach(() => {
    container = document.createElement('div')
    root = createRoot(container)
    const listeners = new Map<string, (data: unknown) => void>()
    deliver = (eventName, data) => listeners.get(eventName)?.(data)
    impl = {
      subscribe: (eventName, callback) => {
        listeners.set(eventName, callback)
        return () => listeners.delete(eventName)
      },
      emit: vi.fn(),
    }
  })

  afterEach(() => {
    act(() => root.unmount())
  })

  const render = (node: React.ReactNode) => {
    act(() => root.render(<InstanceEventProvider value={impl}>{node}</InstanceEventProvider>))
  }

  it('カスタムイベントは { payload, senderId, timestamp } で受け取り、送るときは値だけ渡す', () => {
    const received = vi.fn()
    let emitReaction: (data: { emoji: string }) => void = () => {}
    const Probe = () => {
      emitReaction = useInstanceEvent<{ emoji: string }>('reaction', received)
      return null
    }
    render(<Probe />)

    const event: InstanceEvent<{ emoji: string }> = {
      payload: { emoji: '👍' },
      senderId: 'user-2',
      timestamp: 1000,
    }
    act(() => deliver('reaction', event))
    act(() => emitReaction({ emoji: '🎉' }))

    expect(received).toHaveBeenCalledWith(event)
    expect(impl.emit).toHaveBeenCalledWith('reaction', { emoji: '🎉' })
  })

  it('プラットフォームイベントはそのまま受け取り、送ることはできない', () => {
    const received = vi.fn()
    let emitJoined: (data: never) => void = () => {}
    const Probe = () => {
      emitJoined = useInstanceEvent('user-joined', received)
      return null
    }
    render(<Probe />)

    act(() => deliver('user-joined', { userId: 'user-2', isGuest: false }))
    act(() => emitJoined(undefined as never))

    expect(received).toHaveBeenCalledWith({ userId: 'user-2', isGuest: false })
    expect(impl.emit).not.toHaveBeenCalled()
  })

  it('型: イベント名で受け取るデータの型が決まる', () => {
    const typeOnly = () => {
      useInstanceEvent('user-joined', (data) => {
        expectTypeOf(data).toEqualTypeOf<UserJoinedEventData>()
      })
      useInstanceEvent('user-left', (data) => {
        expectTypeOf(data).toEqualTypeOf<UserLeftEventData>()
      })
      const emit = useInstanceEvent<{ emoji: string }>('reaction', (event) => {
        expectTypeOf(event).toEqualTypeOf<InstanceEvent<{ emoji: string }>>()
      })
      expectTypeOf(emit).parameter(0).toEqualTypeOf<{ emoji: string }>()
    }
    expect(typeOnly).toBeTypeOf('function')
  })
})
