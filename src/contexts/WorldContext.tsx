import { createContext, type ReactNode, useContext } from 'react'

export interface WorldInfo {
  id: string
  name: string
  description: string | null
  thumbnailUrl: string | null
  isPublic: boolean
  instanceCount: number
  totalVisitCount: number
  uniqueVisitorCount: number
  favoriteCount: number
  owner?: {
    id: string
    displayName: string
    userIconUrl?: string | null
  }
}

export interface WorldContextValue {
  /** worldId からワールド情報を取得 */
  getWorldInfo: (worldId: string) => Promise<WorldInfo>
}

/**
 * 開発環境用のデフォルト実装（console.log のみ）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultWorldImplementation = (): WorldContextValue => ({
  getWorldInfo: async (worldId) => {
    console.log('[World] getWorldInfo called', worldId)
    return {
      id: '',
      name: '',
      description: null,
      thumbnailUrl: null,
      isPublic: false,
      instanceCount: 0,
      totalVisitCount: 0,
      uniqueVisitorCount: 0,
      favoriteCount: 0,
    }
  },
})

/**
 * ワールド情報の取得機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const WorldContext = createContext<WorldContextValue | null>(null)

interface Props {
  value: WorldContextValue
  children: ReactNode
}

/**
 * ワールド情報の取得機能を提供する ContextProvider
 */
export const WorldProvider = ({ value, children }: Props) => {
  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
}

/**
 * ワールドの Context を取得する hook
 * @throws {Error} WorldProvider の外で呼び出された場合
 */
export const useWorldContext = (): WorldContextValue => {
  const context = useContext(WorldContext)
  if (!context) {
    throw new Error('useWorldContext must be used within WorldProvider')
  }
  return context
}
