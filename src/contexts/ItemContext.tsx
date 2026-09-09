import { createContext, type ReactNode, useContext, useMemo } from 'react'

/** アイテムを設置したユーザー */
export type ItemPlacer = {
  /** 設置者の userId。サーバーが確定した値で、常に入る */
  id: string
  /** 表示名。設置者が退室済みなどでプロフィールを解決できない場合は null */
  displayName: string | null
  /** アイコン URL。解決できない場合は null */
  avatarUrl: string | null
  /** 自分（ローカルユーザー）が設置したものか */
  isLocalUser: boolean
}

export type ItemContextValue = {
  /** 配置オブジェクトの固有ID */
  id: string
  /**
   * 設置者。プラットフォームはプレビュー中（配置前）に自分を渡す想定。
   * 設置者を特定できない場合（永続シーン由来、Provider に渡されていない）は null
   */
  placedBy: ItemPlacer | null
}

const ItemContext = createContext<ItemContextValue | null>(null)

interface Props {
  id: string
  placedBy?: ItemPlacer | null
  children: ReactNode
}

export function ItemProvider({ id, placedBy = null, children }: Props) {
  // placedBy はプラットフォーム側で毎レンダー組み直される可能性があるため、
  // オブジェクト参照ではなく各フィールドの値を依存にして安定化する
  const value = useMemo<ItemContextValue>(
    () => ({ id, placedBy }),
    // eslint 未導入のため exhaustive-deps の警告は出ない。ItemPlacer にフィールドを足したらここにも追加する
    [id, placedBy?.id, placedBy?.displayName, placedBy?.avatarUrl, placedBy?.isLocalUser],
  )

  return <ItemContext.Provider value={value}>{children}</ItemContext.Provider>
}

/**
 * 配置されたアイテムの固有IDと設置者情報を取得するhook
 * Provider 外では例外をスローする
 */
export function useItem(): ItemContextValue {
  const ctx = useContext(ItemContext)
  if (!ctx) throw new Error('useItem must be used within ItemProvider')
  return ctx
}
