import { createContext, type ReactNode, useContext, useMemo } from 'react'

export type PlacementMode = 'preview' | 'placed'

export type PlacementStateContextValue = {
  mode: PlacementMode
}

const FALLBACK_VALUE: PlacementStateContextValue = { mode: 'placed' }

const PlacementStateContext = createContext<PlacementStateContextValue | null>(null)

export function PlacementStateProvider({
  mode,
  children,
}: {
  mode: PlacementMode
  children: ReactNode
}) {
  const value = useMemo(() => ({ mode }), [mode])
  return (
    <PlacementStateContext.Provider value={value}>
      {children}
    </PlacementStateContext.Provider>
  )
}

/**
 * アイテムの配置状態を取得するhook
 * Provider 外では 'placed' をフォールバック
 * 理由: Provider なし ＝ ワールド内の通常オブジェクト ＝ 設置済みとみなすのが自然
 */
export function usePlacementState(): PlacementStateContextValue {
  const ctx = useContext(PlacementStateContext)
  if (!ctx) return FALLBACK_VALUE
  return ctx
}
