import { createContext, type ReactNode, useContext } from 'react'

export interface InstanceEventContextValue {
  /** イベントを購読する。戻り値は購読解除関数 */
  subscribe: (eventName: string, callback: (data: unknown) => void) => () => void
  /** インスタンス独自イベントを送信する */
  emit: (eventName: string, data: unknown) => void
}

/**
 * 開発環境用のデフォルト実装（ローカル EventEmitter）
 * プラットフォーム側が WebSocket 実装を注入しない場合に使用される
 */
export const createDefaultInstanceEventImplementation = (): InstanceEventContextValue => {
  const listeners = new Map<string, Set<(data: unknown) => void>>()

  const subscribe = (eventName: string, callback: (data: unknown) => void): (() => void) => {
    if (!listeners.has(eventName)) {
      listeners.set(eventName, new Set())
    }
    const set = listeners.get(eventName)!
    set.add(callback)

    return () => {
      set.delete(callback)
      if (set.size === 0) {
        listeners.delete(eventName)
      }
    }
  }

  const emit = (eventName: string, data: unknown): void => {
    const set = listeners.get(eventName)
    if (!set) return
    for (const cb of set) {
      cb(data)
    }
  }

  return { subscribe, emit }
}

/**
 * インスタンスイベントの送受信を提供する Context
 * xrift-frontend 側で WebSocket 実装を注入し、ワールド側で利用できる
 */
export const InstanceEventContext = createContext<InstanceEventContextValue | null>(null)

interface Props {
  value: InstanceEventContextValue
  children: ReactNode
}

/**
 * インスタンスイベントの送受信を提供する ContextProvider
 */
export const InstanceEventProvider = ({ value, children }: Props) => {
  return <InstanceEventContext.Provider value={value}>{children}</InstanceEventContext.Provider>
}

/**
 * インスタンスイベントの Context を取得する hook
 * @throws {Error} InstanceEventProvider の外で呼び出された場合
 */
export const useInstanceEventContext = (): InstanceEventContextValue => {
  const context = useContext(InstanceEventContext)
  if (!context) {
    throw new Error('useInstanceEventContext must be used within InstanceEventProvider')
  }
  return context
}
