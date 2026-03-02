import { createContext, type ReactNode, useContext } from 'react'

export interface InstanceInfo {
  instanceName: string
  worldName: string
  thumbnailUrl: string | null
  currentUsers: number
  maxCapacity: number
}

export interface InstanceInfoContextValue {
  /** instanceId からインスタンス情報を取得 */
  getInstanceInfo: (instanceId: string) => Promise<InstanceInfo>
  /** 指定インスタンスへ遷移 */
  navigateToInstance: (instanceId: string) => void
}

/**
 * 開発環境用のデフォルト実装（console.log のみ）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultInstanceInfoImplementation = (): InstanceInfoContextValue => ({
  getInstanceInfo: async (instanceId) => {
    console.log('[InstanceInfo] getInstanceInfo called', instanceId)
    return {
      instanceName: '',
      worldName: '',
      thumbnailUrl: null,
      currentUsers: 0,
      maxCapacity: 0,
    }
  },
  navigateToInstance: (instanceId) =>
    console.log('[InstanceInfo] navigateToInstance called', instanceId),
})

/**
 * インスタンス情報の取得・遷移機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const InstanceInfoContext = createContext<InstanceInfoContextValue | null>(null)

interface Props {
  value: InstanceInfoContextValue
  children: ReactNode
}

/**
 * インスタンス情報の取得・遷移機能を提供する ContextProvider
 */
export const InstanceInfoProvider = ({ value, children }: Props) => {
  return <InstanceInfoContext.Provider value={value}>{children}</InstanceInfoContext.Provider>
}

/**
 * インスタンス情報の Context を取得する hook
 * @throws {Error} InstanceInfoProvider の外で呼び出された場合
 */
export const useInstanceInfoContext = (): InstanceInfoContextValue => {
  const context = useContext(InstanceInfoContext)
  if (!context) {
    throw new Error('useInstanceInfoContext must be used within InstanceInfoProvider')
  }
  return context
}
