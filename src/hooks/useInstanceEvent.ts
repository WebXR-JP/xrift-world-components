import { useCallback, useEffect, useRef } from 'react'
import { useInstanceEventContext } from '../contexts/InstanceEventContext'

/** プラットフォームが管理する予約イベント（ワールド側から emit 不可） */
const PLATFORM_EVENTS = new Set(['user-joined', 'user-left'])

/**
 * インスタンスイベントの送受信を行う hook
 *
 * プラットフォームイベント（user-joined, user-left）を受信したり、
 * ワールド独自のカスタムイベントを送受信できます。
 *
 * @param eventName イベント名
 * @param callback イベント受信時のコールバック
 * @returns イベント送信関数（プラットフォーム予約イベントの場合は no-op）
 *
 * @example
 * // ユーザー入室イベントを受信
 * useInstanceEvent('user-joined', (data) => {
 *   console.log('User joined:', data)
 * })
 *
 * @example
 * // カスタムイベントの送受信
 * const emitReaction = useInstanceEvent('reaction', (data) => {
 *   console.log('Reaction received:', data)
 * })
 * emitReaction({ emoji: '👍', userId: 'user-1' })
 */
export function useInstanceEvent<T = unknown>(
  eventName: string,
  callback: (data: T) => void,
): (data: T) => void {
  const { subscribe, emit } = useInstanceEventContext()
  const callbackRef = useRef(callback)

  // コールバック参照を常に最新に保持（stale closure 回避）
  callbackRef.current = callback

  useEffect(() => {
    const unsubscribe = subscribe(eventName, (data) => {
      callbackRef.current(data as T)
    })
    return unsubscribe
  }, [subscribe, eventName])

  return useCallback(
    (data: T) => {
      if (PLATFORM_EVENTS.has(eventName)) return
      emit(eventName, data)
    },
    [emit, eventName],
  )
}
