import { createContext, type ReactNode, useContext, useMemo } from 'react'

export type ItemContextValue = {
  id: string
}

const ItemContext = createContext<ItemContextValue | null>(null)

export function ItemProvider({
  id,
  children,
}: {
  id: string
  children: ReactNode
}) {
  const value = useMemo(() => ({ id }), [id])
  return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>
}

/**
 * 配置されたアイテムの固有IDを取得するhook
 * Provider 外では例外をスローする
 */
export function useItem(): ItemContextValue {
  const ctx = useContext(ItemContext)
  if (!ctx) throw new Error('useItem must be used within ItemProvider')
  return ctx
}
