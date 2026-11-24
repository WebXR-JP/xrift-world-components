import {
  WORLD_STORAGE_LIMITS,
  WorldStorageError,
  getWorldStorageEntrySize,
  incrementWorldStorageValue,
  isValidWorldStorageKey,
  WORLD_STORAGE_KEY_PATTERN,
  type WorldStorageContextValue,
  type WorldStorageEntry,
} from '../../../../contexts/WorldStorageContext'
import { DEV_LOCAL_USER_ID } from '../../constants'

/** 保存しておく中身（共有KVと、自分のユーザー別KV） */
export interface DevWorldStorageSnapshot {
  shared: Record<string, unknown>
  player: Record<string, unknown>
}

/** 中身の読み書き先（localStorage など） */
export interface DevWorldStorageBackend {
  load: () => DevWorldStorageSnapshot | null
  save: (snapshot: DevWorldStorageSnapshot) => void
}

/** JSON にして戻す（本番はサーバーを通るので、保存した値と返る値は別のオブジェクトになる） */
const toJsonValue = (value: unknown): unknown =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value))

const assertValidKey = (key: string): void => {
  if (isValidWorldStorageKey(key)) return
  throw new WorldStorageError(
    'INVALID_KEY',
    `Invalid storage key: "${key}" (must match ${WORLD_STORAGE_KEY_PATTERN})`,
  )
}

/**
 * DevEnvironment の World Storage（本番と同じ制限で、backend に保存する＝リロードしても残る）。
 * 開発環境はひとりなので、ユーザー別KVは自分（DEV_LOCAL_USER_ID）のぶんだけ持つ
 */
export function createDevWorldStorage(backend: DevWorldStorageBackend): WorldStorageContextValue {
  const loaded = backend.load()
  const snapshot: DevWorldStorageSnapshot = {
    shared: { ...(loaded?.shared ?? {}) },
    player: { ...(loaded?.player ?? {}) },
  }
  // 合計容量は書き込みのたびに全部を数え直さず、足し引きで持つ
  let totalSize = [...Object.values(snapshot.shared), ...Object.values(snapshot.player)].reduce<number>(
    (sum, value) => sum + getWorldStorageEntrySize(value),
    0,
  )

  const write = (
    area: Record<string, unknown>,
    keyLimit: number,
    key: string,
    value: unknown,
  ): void => {
    const entrySize = getWorldStorageEntrySize(value)
    if (entrySize > WORLD_STORAGE_LIMITS.entrySize) {
      throw new WorldStorageError(
        'ENTRY_TOO_LARGE',
        `Entry exceeds max size of ${WORLD_STORAGE_LIMITS.entrySize} bytes`,
      )
    }
    const exists = Object.prototype.hasOwnProperty.call(area, key)
    if (!exists && Object.keys(area).length >= keyLimit) {
      throw new WorldStorageError('LIMIT_EXCEEDED', `Key count exceeds limit of ${keyLimit}`)
    }
    const previousSize = exists ? getWorldStorageEntrySize(area[key]) : 0
    if (totalSize - previousSize + entrySize > WORLD_STORAGE_LIMITS.totalSize) {
      throw new WorldStorageError(
        'QUOTA_EXCEEDED',
        `World storage exceeds ${WORLD_STORAGE_LIMITS.totalSize} bytes`,
      )
    }
    area[key] = toJsonValue(value)
    totalSize += entrySize - previousSize
    backend.save(snapshot)
  }

  const createArea = (area: Record<string, unknown>, keyLimit: number) => ({
    get: async (key: string) => {
      assertValidKey(key)
      return toJsonValue(area[key])
    },
    list: async (): Promise<WorldStorageEntry[]> =>
      Object.entries(area).map(([key, value]) => ({ key, value: toJsonValue(value) })),
    set: async (key: string, value: unknown) => {
      assertValidKey(key)
      write(area, keyLimit, key, value)
    },
    increment: async (key: string, delta: number) => {
      assertValidKey(key)
      const next = incrementWorldStorageValue(area[key], delta)
      write(area, keyLimit, key, next)
      return next
    },
    delete: async (key: string) => {
      assertValidKey(key)
      if (!Object.prototype.hasOwnProperty.call(area, key)) return
      totalSize -= getWorldStorageEntrySize(area[key])
      delete area[key]
      backend.save(snapshot)
    },
  })

  const shared = createArea(snapshot.shared, WORLD_STORAGE_LIMITS.sharedKeys)
  const mine = createArea(snapshot.player, WORLD_STORAGE_LIMITS.playerKeysPerUser)
  // 開発環境にほかのユーザーはいないので、自分以外の値は空
  const isOther = (userId?: string) => userId !== undefined && userId !== DEV_LOCAL_USER_ID

  return {
    shared,
    player: {
      get: async (key, options) => {
        if (isOther(options?.userId)) {
          assertValidKey(key)
          return undefined
        }
        return mine.get(key)
      },
      list: async (options) => (isOther(options?.userId) ? [] : mine.list()),
      set: mine.set,
      increment: mine.increment,
      delete: mine.delete,
    },
  }
}

/**
 * localStorage に保存する backend。使えない（プライベートブラウズ・容量切れなど）ときは
 * 黙ってメモリだけで動く（そのときはリロードで消える）
 */
export function createLocalStorageBackend(storageKey: string): DevWorldStorageBackend {
  return {
    load: () => {
      try {
        const raw = window.localStorage.getItem(storageKey)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<DevWorldStorageSnapshot>
        return { shared: parsed.shared ?? {}, player: parsed.player ?? {} }
      } catch {
        return null
      }
    },
    save: (snapshot) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
      } catch (error) {
        console.warn('[DevEnvironment] World Storage を localStorage に保存できませんでした', error)
      }
    },
  }
}
