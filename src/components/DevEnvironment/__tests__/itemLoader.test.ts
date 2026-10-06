import { describe, expect, it, vi } from 'vitest'
import { createDefaultItemLoaderImplementation } from '../../../contexts/ItemLoaderContext'
import { createDevItemLoader, errorFromResolveStatus } from '../itemLoader'

describe('errorFromResolveStatus', () => {
  it('HTTP の状態から理由を決める', () => {
    expect(errorFromResolveStatus(401, false).code).toBe('LOGIN_REQUIRED')
    expect(errorFromResolveStatus(403, false).code).toBe('FORBIDDEN')
    expect(errorFromResolveStatus(404, false).code).toBe('NOT_FOUND')
    expect(errorFromResolveStatus(500, false).code).toBe('LOAD_FAILED')
  })

  it('本文に code があればそれを優先する（中継が「宣言されていない」を伝えてくる）', () => {
    const error = errorFromResolveStatus(404, false, {
      code: 'NOT_DECLARED',
      error: 'xrift.json の world.items に宣言されていません',
    })
    expect(error.code).toBe('NOT_DECLARED')
    expect(error.message).toBe('xrift.json の world.items に宣言されていません')
    // 知らない code・本文なしは status から決める
    expect(errorFromResolveStatus(404, false, { code: 'SOMETHING', error: 'x' }).code).toBe('NOT_FOUND')
    expect(errorFromResolveStatus(404, false, { code: 'NOT_DECLARED' }).code).toBe('NOT_FOUND')
  })

  it('中継が無い（JSON でない応答）ときは状態に関係なく NOT_AVAILABLE', () => {
    const error = errorFromResolveStatus(404, true)
    expect(error.code).toBe('NOT_AVAILABLE')
    expect(error.message).toContain('xriftDev()')
  })
})

describe('createDefaultItemLoaderImplementation', () => {
  it('読む手段が無いことを NOT_AVAILABLE で伝える', async () => {
    await expect(createDefaultItemLoaderImplementation().load('item-1')).rejects.toMatchObject({
      code: 'NOT_AVAILABLE',
    })
  })
})

describe('createDevItemLoader', () => {
  it('差し込まれたローカルのアイテムは中継を叩かずに返し、表の差し替えに追従する', async () => {
    const Local = () => null
    const table: Record<string, typeof Local> = {}
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const loader = createDevItemLoader({ items: (itemId) => table[itemId] })

    table['item-1'] = Local
    const loaded = await loader.load('item-1')
    expect(loaded.Item).toBe(Local)
    expect(loaded.sceneUrl).toBe('/')
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('中継の失敗応答（JSON）の code を ItemLoadError に写す', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'NOT_DECLARED', error: '宣言されていません' }), {
          status: 404,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }),
      ),
    )
    const loader = createDevItemLoader()
    await expect(loader.load('item-1')).rejects.toMatchObject({
      code: 'NOT_DECLARED',
      message: '宣言されていません',
    })
  })

  it('中継が JSON を返さなければ（Vite の index.html など）NOT_AVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }),
      ),
    )
    const loader = createDevItemLoader()
    await expect(loader.load('item-1')).rejects.toMatchObject({ code: 'NOT_AVAILABLE' })
    vi.unstubAllGlobals()
  })
})
