import { describe, expect, it, vi } from 'vitest'
import { WORLD_STORAGE_LIMITS, WorldStorageError } from '../../../../../contexts/WorldStorageContext'
import { DEV_LOCAL_USER_ID } from '../../../constants'
import {
  createDevWorldStorage,
  createLocalStorageBackend,
  type DevWorldStorageBackend,
  type DevWorldStorageSnapshot,
} from '../store'

const createMemoryBackend = (initial: DevWorldStorageSnapshot | null = null) => {
  let saved: DevWorldStorageSnapshot | null = initial
  const backend: DevWorldStorageBackend = {
    load: () => (saved ? JSON.parse(JSON.stringify(saved)) : null),
    save: (snapshot) => {
      saved = JSON.parse(JSON.stringify(snapshot))
    },
  }
  return { backend, getSaved: () => saved }
}

const expectCode = async (promise: Promise<unknown>, code: string) => {
  await expect(promise).rejects.toBeInstanceOf(WorldStorageError)
  await expect(promise).rejects.toMatchObject({ code })
}

describe('createDevWorldStorage', () => {
  it('書いた値が保存され、作り直しても（リロードしても）残る', async () => {
    const { backend } = createMemoryBackend()
    const first = createDevWorldStorage(backend)
    await first.shared.set('score', { best: 10 })
    await first.player.set('name', 'Alice')

    const second = createDevWorldStorage(backend)
    expect(await second.shared.get('score')).toEqual({ best: 10 })
    expect(await second.player.get('name')).toBe('Alice')
    expect(await second.shared.list()).toEqual([{ key: 'score', value: { best: 10 } }])
  })

  it('increment は数値を足して保存する。数値でなければ TYPE_MISMATCH', async () => {
    const { backend } = createMemoryBackend()
    const storage = createDevWorldStorage(backend)
    expect(await storage.shared.increment('count', 2)).toBe(2)
    expect(await storage.shared.increment('count', 3)).toBe(5)
    await storage.shared.set('text', 'a')
    await expectCode(storage.shared.increment('text', 1), 'TYPE_MISMATCH')
  })

  it('delete で消え、保存にも反映される（無いキーでも失敗しない）', async () => {
    const { backend, getSaved } = createMemoryBackend()
    const storage = createDevWorldStorage(backend)
    await storage.shared.set('a', 1)
    await storage.shared.delete('a')
    await storage.shared.delete('missing')
    expect(await storage.shared.get('a')).toBeUndefined()
    expect(getSaved()?.shared).toEqual({})
  })

  it('保存した値を後から書き換えても、保存した中身は変わらない（本番と同じく別のオブジェクト）', async () => {
    const storage = createDevWorldStorage(createMemoryBackend().backend)
    const value = { list: [1] }
    await storage.shared.set('v', value)
    value.list.push(2)
    expect(await storage.shared.get('v')).toEqual({ list: [1] })
  })

  it('不正なキーは INVALID_KEY', async () => {
    const storage = createDevWorldStorage(createMemoryBackend().backend)
    await expectCode(storage.shared.set('bad key!', 1), 'INVALID_KEY')
    await expectCode(storage.player.get('bad key!'), 'INVALID_KEY')
  })

  it('1 件が大きすぎると ENTRY_TOO_LARGE', async () => {
    const storage = createDevWorldStorage(createMemoryBackend().backend)
    await expectCode(storage.shared.set('big', 'x'.repeat(WORLD_STORAGE_LIMITS.entrySize + 1)), 'ENTRY_TOO_LARGE')
  })

  it('ユーザー別KVのキー数を超えると LIMIT_EXCEEDED（既存キーの上書きは通る）', async () => {
    const storage = createDevWorldStorage(createMemoryBackend().backend)
    for (let i = 0; i < WORLD_STORAGE_LIMITS.playerKeysPerUser; i++) await storage.player.set(`k${i}`, i)
    await expectCode(storage.player.set('over', 1), 'LIMIT_EXCEEDED')
    await expect(storage.player.set('k0', 'updated')).resolves.toBeUndefined()
  })

  it('合計容量を超えると QUOTA_EXCEEDED（消すとまた書ける）', async () => {
    const storage = createDevWorldStorage(createMemoryBackend().backend)
    const chunk = 'x'.repeat(WORLD_STORAGE_LIMITS.entrySize - 10)
    const fits = Math.floor(WORLD_STORAGE_LIMITS.totalSize / (WORLD_STORAGE_LIMITS.entrySize - 8))
    for (let i = 0; i < fits; i++) await storage.shared.set(`s${i}`, chunk)
    await expectCode(storage.shared.set('over', chunk), 'QUOTA_EXCEEDED')
    await storage.shared.delete('s0')
    await expect(storage.shared.set('over', chunk)).resolves.toBeUndefined()
  })

  it('自分以外のユーザーの値は空、自分の ID を指定すれば自分の値', async () => {
    const storage = createDevWorldStorage(createMemoryBackend().backend)
    await storage.player.set('name', 'Alice')
    expect(await storage.player.get('name', { userId: 'someone-else' })).toBeUndefined()
    expect(await storage.player.list({ userId: 'someone-else' })).toEqual([])
    expect(await storage.player.get('name', { userId: DEV_LOCAL_USER_ID })).toBe('Alice')
  })
})

describe('createDevWorldStorage のキーと保存データ', () => {
  it('キー __proto__ も普通のキーとして保存・読み出しでき、作り直しても残る', async () => {
    const { backend } = createMemoryBackend()
    const storage = createDevWorldStorage(backend)
    await storage.shared.set('__proto__', 1)
    expect(await storage.shared.get('__proto__')).toBe(1)
    expect(await storage.shared.list()).toEqual([{ key: '__proto__', value: 1 }])
    expect(await createDevWorldStorage(backend).shared.get('__proto__')).toBe(1)
  })
})

describe('createLocalStorageBackend', () => {
  it('形の違う保存データは空として扱う', () => {
    const store = new Map<string, string>([['k', JSON.stringify({ shared: 'abc', player: [1, 2] })]])
    vi.stubGlobal('window', {
      localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: () => {} },
    })
    expect(createLocalStorageBackend('k').load()).toEqual({ shared: {}, player: {} })
    vi.unstubAllGlobals()
  })

  it('保存に失敗しても警告は一度だけ', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
      },
    })
    const backend = createLocalStorageBackend('k')
    backend.save({ shared: {}, player: {} })
    backend.save({ shared: {}, player: {} })
    expect(warn).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
    warn.mockRestore()
  })
})
