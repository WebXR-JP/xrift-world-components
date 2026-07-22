import { createContext, type ReactNode, useContext } from 'react'

/**
 * World Storage のエラーコード
 * バックエンド API のエラーコードと対応する
 */
export type WorldStorageErrorCode =
  /** ワールド合計容量（10MB）を超過 */
  | 'QUOTA_EXCEEDED'
  /** キー数上限を超過（共有: 256キー / ユーザーあたり: 64キー） */
  | 'LIMIT_EXCEEDED'
  /** 1エントリの上限（100KB）を超過 */
  | 'ENTRY_TOO_LARGE'
  /** increment 対象の既存値が数値でない */
  | 'TYPE_MISMATCH'
  /** キー形式が不正（`/^[A-Za-z0-9_.\-:]{1,128}$/` に一致しない） */
  | 'INVALID_KEY'
  /** ワールドのインスタンスに参加していない状態での書き込み */
  | 'NOT_IN_WORLD'
  /** レートリミット超過（書き込みはユーザーごと 30回/分） */
  | 'RATE_LIMITED'
  /** 未認証（ゲスト）での書き込み */
  | 'UNAUTHORIZED'
  /** その他のエラー */
  | 'UNKNOWN'

/**
 * World Storage の操作が失敗した際に投げられるエラー
 */
export class WorldStorageError extends Error {
  readonly code: WorldStorageErrorCode

  constructor(code: WorldStorageErrorCode, message: string) {
    super(message)
    this.name = 'WorldStorageError'
    this.code = code
  }
}

/**
 * キーと値のペア（list の戻り値）
 */
export interface WorldStorageEntry {
  key: string
  value: unknown
}

/**
 * 共有KV（ワールドに1つの共有値）
 * インスタンス参加中の認証ユーザーなら誰でも書ける。読み取りは公開
 */
export interface SharedWorldStorage {
  /** 値を取得する。存在しない場合は undefined */
  get: (key: string) => Promise<unknown>
  /** すべてのキーと値を取得する */
  list: () => Promise<WorldStorageEntry[]>
  /** 値を保存する */
  set: (key: string, value: unknown) => Promise<void>
  /** 数値を加算し、加算後の値を返す（同時実行でも加算がロストしない） */
  increment: (key: string, delta: number) => Promise<number>
  /** 値を削除する（冪等） */
  delete: (key: string) => Promise<void>
}

/**
 * ユーザー別KV
 * 書き込みは自分の値のみ。読み取りは他人の値も可（公開読み取り）
 */
export interface PlayerWorldStorage {
  /**
   * 値を取得する。存在しない場合は undefined
   * `options.userId` を指定すると他のユーザーの値を読める
   */
  get: (key: string, options?: { userId?: string }) => Promise<unknown>
  /**
   * すべてのキーと値を取得する
   * `options.userId` を指定すると他のユーザーの値を読める
   */
  list: (options?: { userId?: string }) => Promise<WorldStorageEntry[]>
  /** 自分の値を保存する */
  set: (key: string, value: unknown) => Promise<void>
  /** 自分の値に数値を加算し、加算後の値を返す */
  increment: (key: string, delta: number) => Promise<number>
  /** 自分の値を削除する（冪等） */
  delete: (key: string) => Promise<void>
}

/**
 * World Storage の Context 値
 */
export interface WorldStorageContextValue {
  /** 共有KV（ワールドに1つの共有値） */
  shared: SharedWorldStorage
  /** ユーザー別KV */
  player: PlayerWorldStorage
}

/** キー形式のパターン */
export const WORLD_STORAGE_KEY_PATTERN = /^[A-Za-z0-9_.\-:]{1,128}$/

/** World Storage の容量・キー数の上限 */
export const WORLD_STORAGE_LIMITS = {
  /** ワールドごとの合計容量（バイト） */
  totalSize: 10 * 1024 * 1024,
  /** 1エントリの最大サイズ（バイト） */
  entrySize: 100 * 1024,
  /** 共有KVの最大キー数 */
  sharedKeys: 256,
  /** ユーザーあたりのユーザー別KVの最大キー数 */
  playerKeysPerUser: 64,
} as const

/**
 * キーが有効な形式かを判定する
 */
export const isValidWorldStorageKey = (key: string): boolean =>
  WORLD_STORAGE_KEY_PATTERN.test(key)

/**
 * 値のサイズ（JSON化したバイト数）を計算する
 */
export const getWorldStorageEntrySize = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value)).byteLength

/**
 * 既存値に delta を加算した結果を返す
 * @throws {WorldStorageError} 既存値が数値でない場合（TYPE_MISMATCH）
 */
export const incrementWorldStorageValue = (current: unknown, delta: number): number => {
  if (current === undefined) return delta
  if (typeof current !== 'number') {
    throw new WorldStorageError(
      'TYPE_MISMATCH',
      `Cannot increment non-numeric value (current: ${typeof current})`,
    )
  }
  return current + delta
}

const assertValidKey = (key: string): void => {
  if (isValidWorldStorageKey(key)) return
  throw new WorldStorageError(
    'INVALID_KEY',
    `Invalid storage key: "${key}" (must match ${WORLD_STORAGE_KEY_PATTERN})`,
  )
}

const assertEntrySize = (value: unknown): void => {
  if (getWorldStorageEntrySize(value) <= WORLD_STORAGE_LIMITS.entrySize) return
  throw new WorldStorageError(
    'ENTRY_TOO_LARGE',
    `Entry exceeds max size of ${WORLD_STORAGE_LIMITS.entrySize} bytes`,
  )
}

const assertKeyCount = (store: Map<string, unknown>, key: string, limit: number): void => {
  if (store.has(key) || store.size < limit) return
  throw new WorldStorageError('LIMIT_EXCEEDED', `Key count exceeds limit of ${limit}`)
}

const createInMemoryStorage = (
  store: Map<string, unknown>,
  keyLimit: number,
): SharedWorldStorage => ({
  get: async (key) => {
    assertValidKey(key)
    return store.get(key)
  },
  list: async () =>
    Array.from(store.entries(), ([key, value]) => ({ key, value })),
  set: async (key, value) => {
    assertValidKey(key)
    assertEntrySize(value)
    assertKeyCount(store, key, keyLimit)
    store.set(key, value)
  },
  increment: async (key, delta) => {
    assertValidKey(key)
    assertKeyCount(store, key, keyLimit)
    const next = incrementWorldStorageValue(store.get(key), delta)
    store.set(key, next)
    return next
  },
  delete: async (key) => {
    assertValidKey(key)
    store.delete(key)
  },
})

/**
 * 開発環境用のデフォルト実装（インメモリ・リロードで消える）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultWorldStorageImplementation = (): WorldStorageContextValue => {
  const sharedStore = new Map<string, unknown>()
  const myStore = new Map<string, unknown>()
  const otherPlayerStores = new Map<string, Map<string, unknown>>()

  const resolvePlayerStore = (userId?: string): Map<string, unknown> => {
    if (!userId) return myStore
    let store = otherPlayerStores.get(userId)
    if (!store) {
      store = new Map()
      otherPlayerStores.set(userId, store)
    }
    return store
  }

  const myStorage = createInMemoryStorage(myStore, WORLD_STORAGE_LIMITS.playerKeysPerUser)

  return {
    shared: createInMemoryStorage(sharedStore, WORLD_STORAGE_LIMITS.sharedKeys),
    player: {
      get: async (key, options) => {
        assertValidKey(key)
        return resolvePlayerStore(options?.userId).get(key)
      },
      list: async (options) =>
        Array.from(resolvePlayerStore(options?.userId).entries(), ([key, value]) => ({
          key,
          value,
        })),
      set: myStorage.set,
      increment: myStorage.increment,
      delete: myStorage.delete,
    },
  }
}

/**
 * World Storage（ワールド単位のKV永続化）を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const WorldStorageContext = createContext<WorldStorageContextValue | null>(null)

interface Props {
  value: WorldStorageContextValue
  children: ReactNode
}

/**
 * World Storage を提供する ContextProvider
 */
export const WorldStorageProvider = ({ value, children }: Props) => {
  return <WorldStorageContext.Provider value={value}>{children}</WorldStorageContext.Provider>
}

/**
 * World Storage の Context を取得する hook
 * @throws {Error} WorldStorageProvider の外で呼び出された場合
 */
export const useWorldStorageContext = (): WorldStorageContextValue => {
  const context = useContext(WorldStorageContext)
  if (!context) {
    throw new Error('useWorldStorageContext must be used within WorldStorageProvider')
  }
  return context
}
