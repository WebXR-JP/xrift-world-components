import { createContext, type ReactNode, useContext } from 'react'

export interface TeleportDestination {
  position: [number, number, number]
  /** 度数法（0-360）省略時は現在の向きを維持 */
  yaw?: number
}

export interface TeleportContextValue {
  teleport: (destination: TeleportDestination) => void
}

/**
 * 開発環境用のデフォルト実装（console.log のみ）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultTeleportImplementation = (): TeleportContextValue => ({
  teleport: (destination) =>
    console.log('[Teleport] teleport called', destination),
})

/**
 * テレポート機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const TeleportContext = createContext<TeleportContextValue | null>(null)

interface Props {
  value: TeleportContextValue
  children: ReactNode
}

/**
 * テレポート機能を提供する ContextProvider
 */
export const TeleportProvider = ({ value, children }: Props) => {
  return <TeleportContext.Provider value={value}>{children}</TeleportContext.Provider>
}

/**
 * テレポートの Context を取得する hook
 * @throws {Error} TeleportProvider の外で呼び出された場合
 */
export const useTeleportContext = (): TeleportContextValue => {
  const context = useContext(TeleportContext)
  if (!context) {
    throw new Error('useTeleportContext must be used within TeleportProvider')
  }
  return context
}
