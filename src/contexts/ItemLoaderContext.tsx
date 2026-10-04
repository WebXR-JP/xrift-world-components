import { type ComponentType, createContext, type ReactNode, useContext } from 'react'

/** アイテムの本体（Module Federation の `./Item`）が受け取る props */
export interface ItemComponentProps {
  position?: [number, number, number]
  scale?: number
}

/** 読み込めたアイテム */
export interface LoadedItem {
  Item: ComponentType<ItemComponentProps>
  /**
   * remoteEntry.js の URL。アイテムが相対パスで読むアセットの基準（baseUrl）をここから作る。
   * ローカルのソースを差し込んだとき（DevEnvironment の items）は '/'
   */
  sceneUrl: string
}

export type ItemLoadErrorCode =
  /** 読み込む手段が無い（ItemLoaderProvider が注入されていない） */
  | 'NOT_AVAILABLE'
  /** xrift.json の `world.items` に宣言されていない */
  | 'NOT_DECLARED'
  /** アイテムが見つからない・審査に通っていない・公開されていない */
  | 'NOT_FOUND'
  /** このアカウントには使う権利がない（自作でもライブラリにも無い） */
  | 'FORBIDDEN'
  /** ログインが要る（ローカル開発なら `xrift login`） */
  | 'LOGIN_REQUIRED'
  /** バンドルの取得・評価に失敗した */
  | 'LOAD_FAILED'

/** アイテムの読み込みが失敗したときに投げる */
export class ItemLoadError extends Error {
  readonly code: ItemLoadErrorCode

  constructor(code: ItemLoadErrorCode, message: string) {
    super(message)
    this.name = 'ItemLoadError'
    this.code = code
  }
}

/** 何であれ ItemLoadError に揃える（ネットワークエラーなどは LOAD_FAILED） */
export function toItemLoadError(error: unknown): ItemLoadError {
  if (error instanceof ItemLoadError) return error
  const message = error instanceof Error ? error.message : String(error)
  return new ItemLoadError('LOAD_FAILED', message)
}

export interface ItemLoaderContextValue {
  /**
   * アイテムの本体を読む。同じ itemId を何度呼んでも読み込みは1回で済むよう、実装側で結果を
   * キャッシュすること（`<Item>` は配置ごとに呼ぶ）
   */
  load: (itemId: string) => Promise<LoadedItem>
}

/**
 * 既定の実装（読み込む手段が無い）
 * プラットフォーム（xrift-frontend）か DevEnvironment が実装を注入しないと `<Item>` は何も描けない
 */
export const createDefaultItemLoaderImplementation = (): ItemLoaderContextValue => ({
  load: async (itemId) => {
    throw new ItemLoadError(
      'NOT_AVAILABLE',
      `アイテム ${itemId} を読み込む手段がありません（ItemLoaderProvider が注入されていません）`,
    )
  },
})

/**
 * ワールドに最初から置くアイテム（`<Item itemId>`）の読み込みを提供する Context
 * xrift-frontend 側（本番）と DevEnvironment（ローカル開発）が実装を注入する
 */
export const ItemLoaderContext = createContext<ItemLoaderContextValue | null>(null)

interface Props {
  value: ItemLoaderContextValue
  children: ReactNode
}

export const ItemLoaderProvider = ({ value, children }: Props) => {
  return <ItemLoaderContext.Provider value={value}>{children}</ItemLoaderContext.Provider>
}

/**
 * アイテム読み込みの Context を取得する hook
 * @throws {Error} ItemLoaderProvider の外で呼び出された場合
 */
export const useItemLoaderContext = (): ItemLoaderContextValue => {
  const context = useContext(ItemLoaderContext)
  if (!context) {
    throw new Error('useItemLoaderContext must be used within ItemLoaderProvider')
  }
  return context
}
