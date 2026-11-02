import { useCallback, useEffect, useRef } from 'react'
import { useInstanceEventContext } from '../contexts/InstanceEventContext'

/** プラットフォームが管理する予約イベント（ワールド側から emit 不可） */
const PLATFORM_EVENTS = new Set(['user-joined', 'user-left'])

/** user-joined で届くデータ */
export interface UserJoinedEventData {
  userId: string
  isGuest: boolean
}

/** user-left で届くデータ */
export interface UserLeftEventData {
  userId: string
}

/**
 * カスタムイベントの受信時に届くデータ
 *
 * 送った値は `payload` に入り、送った人の userId とプラットフォームの時刻が付く。
 * `senderId` はサーバーが付けるので、送り手が偽ることはできない。
 */
export interface InstanceEvent<T> {
  /** 送り手が emit に渡した値 */
  payload: T
  /** 送った人の userId */
  senderId: string
  /** 送った時刻（インスタンス共有時計の ms） */
  timestamp: number
}

/**
 * インスタンスイベントの送受信を行う hook
 *
 * プラットフォームイベント（user-joined, user-left）を受信したり、
 * ワールド独自のカスタムイベントを送受信できます。
 *
 * - カスタムイベントは `{ payload, senderId, timestamp }` の形で届く（送った値は `payload`）
 * - 送った本人には届かない。自分の画面にも反映するなら、送るときに自分でも処理する
 * - 入室処理が終わる前に送った分は、終わってから届けられる
 *
 * @param eventName イベント名
 * @param callback イベント受信時のコールバック
 * @returns イベント送信関数（プラットフォーム予約イベントの場合は no-op）
 *
 * @example
 * // ユーザー入室イベントを受信
 * useInstanceEvent('user-joined', ({ userId }) => {
 *   console.log('User joined:', userId)
 * })
 *
 * @example
 * // カスタムイベントの送受信
 * const emitReaction = useInstanceEvent<{ emoji: string }>('reaction', ({ payload, senderId }) => {
 *   console.log(`${senderId} reacted:`, payload.emoji)
 * })
 * emitReaction({ emoji: '👍' })
 */
export function useInstanceEvent<T = UserJoinedEventData>(
  eventName: 'user-joined',
  callback: (data: T) => void,
): (data: never) => void
export function useInstanceEvent<T = UserLeftEventData>(
  eventName: 'user-left',
  callback: (data: T) => void,
): (data: never) => void
export function useInstanceEvent<T = unknown>(
  eventName: string,
  callback: (event: InstanceEvent<T>) => void,
): (data: T) => void
export function useInstanceEvent(
  eventName: string,
  // 届くデータの型はイベント名で決まる（上のオーバーロード）。実装では区別しない
  callback: (data: never) => void,
): (data: never) => void {
  const { subscribe, emit } = useInstanceEventContext()
  const callbackRef = useRef(callback as (data: unknown) => void)

  // コールバック参照を常に最新に保持（stale closure 回避）
  callbackRef.current = callback as (data: unknown) => void

  useEffect(() => {
    const unsubscribe = subscribe(eventName, (data) => {
      callbackRef.current(data)
    })
    return unsubscribe
  }, [subscribe, eventName])

  return useCallback(
    (data: unknown) => {
      if (PLATFORM_EVENTS.has(eventName)) return
      emit(eventName, data)
    },
    [emit, eventName],
  )
}
