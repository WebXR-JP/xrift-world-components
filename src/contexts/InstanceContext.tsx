import { createContext, type ReactNode, useContext } from 'react'
import type { WorldInfo } from './WorldContext'

export interface InstanceInfo {
  id: string
  name: string
  description: string | null
  currentUsers: number
  maxCapacity: number
  isPublic: boolean
  allowGuests: boolean
  owner?: {
    id: string
    displayName: string
    userIconUrl?: string | null
  }
  world: WorldInfo
}

export interface InstanceContextValue {
  /** instanceId からインスタンス情報を取得 */
  getInstanceInfo: (instanceId: string) => Promise<InstanceInfo>
  /** 指定インスタンスへ遷移 */
  navigateToInstance: (instanceId: string) => void
}

/**
 * 開発環境用のデフォルト実装（console.log のみ）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultInstanceImplementation = (): InstanceContextValue => ({
  getInstanceInfo: async (instanceId) => {
    console.log('[Instance] getInstanceInfo called', instanceId)
    return {
      id: '',
      name: '',
      description: null,
      currentUsers: 0,
      maxCapacity: 0,
      isPublic: false,
      allowGuests: false,
      world: {
        id: '',
        name: '',
        description: null,
        thumbnailUrl: null,
        isPublic: false,
        instanceCount: 0,
        totalVisitCount: 0,
        uniqueVisitorCount: 0,
        favoriteCount: 0,
      },
    }
  },
  navigateToInstance: (instanceId) =>
    console.log('[Instance] navigateToInstance called', instanceId),
})

/**
 * インスタンス情報の取得・遷移機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const InstanceContext = createContext<InstanceContextValue | null>(null)

interface Props {
  value: InstanceContextValue
  children: ReactNode
}

/**
 * インスタンス情報の取得・遷移機能を提供する ContextProvider
 */
export const InstanceProvider = ({ value, children }: Props) => {
  return <InstanceContext.Provider value={value}>{children}</InstanceContext.Provider>
}

/**
 * インスタンスの Context を取得する hook
 * @throws {Error} InstanceProvider の外で呼び出された場合
 */
export const useInstanceContext = (): InstanceContextValue => {
  const context = useContext(InstanceContext)
  if (!context) {
    throw new Error('useInstanceContext must be used within InstanceProvider')
  }
  return context
}
