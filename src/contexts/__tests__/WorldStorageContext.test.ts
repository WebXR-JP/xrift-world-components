import { describe, expect, it } from 'vitest'
import {
  WORLD_STORAGE_LIMITS,
  WorldStorageError,
  createDefaultWorldStorageImplementation,
  getWorldStorageEntrySize,
  incrementWorldStorageValue,
  isValidWorldStorageKey,
} from '../WorldStorageContext'

describe('isValidWorldStorageKey', () => {
  it('英数字・アンダースコア・ドット・ハイフン・コロンを許可する', () => {
    expect(isValidWorldStorageKey('event_phase')).toBe(true)
    expect(isValidWorldStorageKey('player.score-1:jp')).toBe(true)
    expect(isValidWorldStorageKey('A')).toBe(true)
  })

  it('空文字を拒否する', () => {
    expect(isValidWorldStorageKey('')).toBe(false)
  })

  it('128文字を超えるキーを拒否する', () => {
    expect(isValidWorldStorageKey('a'.repeat(128))).toBe(true)
    expect(isValidWorldStorageKey('a'.repeat(129))).toBe(false)
  })

  it('許可されない文字を拒否する', () => {
    expect(isValidWorldStorageKey('日本語')).toBe(false)
    expect(isValidWorldStorageKey('key with space')).toBe(false)
    expect(isValidWorldStorageKey('key/slash')).toBe(false)
  })
})

describe('getWorldStorageEntrySize', () => {
  it('JSON化したバイト数を返す', () => {
    expect(getWorldStorageEntrySize('ab')).toBe(4) // "ab"
    expect(getWorldStorageEntrySize(123)).toBe(3)
    expect(getWorldStorageEntrySize({ a: 1 })).toBe(7) // {"a":1}
  })

  it('マルチバイト文字をバイト数で数える', () => {
    expect(getWorldStorageEntrySize('あ')).toBe(5) // "あ" = 2(引用符) + 3
  })
})

describe('incrementWorldStorageValue', () => {
  it('既存値が undefined の場合は delta を返す', () => {
    expect(incrementWorldStorageValue(undefined, 5)).toBe(5)
  })

  it('既存の数値に delta を加算する', () => {
    expect(incrementWorldStorageValue(10, 5)).toBe(15)
    expect(incrementWorldStorageValue(10, -3)).toBe(7)
  })

  it('浮動小数点の加算ができる', () => {
    expect(incrementWorldStorageValue(0.1, 0.2)).toBeCloseTo(0.3)
  })

  it('既存値が数値以外の場合は TYPE_MISMATCH を投げる', () => {
    expect(() => incrementWorldStorageValue('text', 1)).toThrowError(WorldStorageError)
    try {
      incrementWorldStorageValue('text', 1)
    } catch (err) {
      expect((err as WorldStorageError).code).toBe('TYPE_MISMATCH')
    }
  })
})

describe('createDefaultWorldStorageImplementation', () => {
  it('shared: set した値を get / list で取得できる', async () => {
    const storage = createDefaultWorldStorageImplementation()
    await storage.shared.set('event_phase', '第2章')
    expect(await storage.shared.get('event_phase')).toBe('第2章')
    expect(await storage.shared.list()).toEqual([{ key: 'event_phase', value: '第2章' }])
  })

  it('shared: 存在しないキーの get は undefined を返す', async () => {
    const storage = createDefaultWorldStorageImplementation()
    expect(await storage.shared.get('missing')).toBeUndefined()
  })

  it('shared: increment は加算後の値を返す', async () => {
    const storage = createDefaultWorldStorageImplementation()
    expect(await storage.shared.increment('total_visits', 1)).toBe(1)
    expect(await storage.shared.increment('total_visits', 2)).toBe(3)
    expect(await storage.shared.get('total_visits')).toBe(3)
  })

  it('shared: delete は冪等', async () => {
    const storage = createDefaultWorldStorageImplementation()
    await storage.shared.set('key', 'value')
    await storage.shared.delete('key')
    await storage.shared.delete('key')
    expect(await storage.shared.get('key')).toBeUndefined()
  })

  it('不正なキーで INVALID_KEY を投げる', async () => {
    const storage = createDefaultWorldStorageImplementation()
    await expect(storage.shared.set('無効なキー', 1)).rejects.toMatchObject({
      code: 'INVALID_KEY',
    })
    await expect(storage.player.get('bad key')).rejects.toMatchObject({
      code: 'INVALID_KEY',
    })
  })

  it('100KB を超える値で ENTRY_TOO_LARGE を投げる', async () => {
    const storage = createDefaultWorldStorageImplementation()
    const large = 'a'.repeat(WORLD_STORAGE_LIMITS.entrySize + 1)
    await expect(storage.shared.set('key', large)).rejects.toMatchObject({
      code: 'ENTRY_TOO_LARGE',
    })
  })

  it('player: キー数上限を超えると LIMIT_EXCEEDED を投げる', async () => {
    const storage = createDefaultWorldStorageImplementation()
    for (let i = 0; i < WORLD_STORAGE_LIMITS.playerKeysPerUser; i++) {
      await storage.player.set(`key-${i}`, i)
    }
    await expect(storage.player.set('one-more', 1)).rejects.toMatchObject({
      code: 'LIMIT_EXCEEDED',
    })
    // 既存キーの上書きは可能
    await storage.player.set('key-0', 100)
    expect(await storage.player.get('key-0')).toBe(100)
  })

  it('player: 自分と他ユーザーの値が分離されている', async () => {
    const storage = createDefaultWorldStorageImplementation()
    await storage.player.set('coins', 340)
    expect(await storage.player.get('coins')).toBe(340)
    expect(await storage.player.get('coins', { userId: 'other-user' })).toBeUndefined()
    expect(await storage.player.list({ userId: 'other-user' })).toEqual([])
  })

  it('shared と player の値が分離されている', async () => {
    const storage = createDefaultWorldStorageImplementation()
    await storage.shared.set('key', 'shared-value')
    await storage.player.set('key', 'player-value')
    expect(await storage.shared.get('key')).toBe('shared-value')
    expect(await storage.player.get('key')).toBe('player-value')
  })
})
