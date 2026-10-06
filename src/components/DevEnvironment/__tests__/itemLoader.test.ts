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
    // 知らない code は status から決める。code があって文言が無ければ code を保ち既定の文言を使う
    expect(errorFromResolveStatus(404, false, { code: 'SOMETHING', error: 'x' }).code).toBe('NOT_FOUND')
    // プロトタイプの名前は code として受け付けない
    expect(errorFromResolveStatus(404, false, { code: 'constructor', error: 'x' }).code).toBe('NOT_FOUND')
    expect(errorFromResolveStatus(404, false, { code: 'toString' }).code).toBe('NOT_FOUND')
    const noMessage = errorFromResolveStatus(404, false, { code: 'NOT_DECLARED' })
    expect(noMessage.code).toBe('NOT_DECLARED')
    expect(noMessage.message).toContain('world.items')
    expect(errorFromResolveStatus(500, false, { code: 'LOAD_FAILED', error: 'x' }).message).toBe('x')
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
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })

  it('差し込まれたローカルのアイテムは解決の中継を叩かずに返し、表の差し替えに追従する', async () => {
    const Local = () => null
    const table: Record<string, typeof Local> = {}
    // 宣言の一覧だけは読む（宣言を見ない状態 items: null）
    const fetchSpy = vi.fn(async (_input: string) => jsonResponse({ items: null }))
    vi.stubGlobal('fetch', fetchSpy)
    const loader = createDevItemLoader({ items: (itemId) => table[itemId] })

    table['item-1'] = Local
    const loaded = await loader.load('item-1')
    expect(loaded.Item).toBe(Local)
    expect(loaded.sceneUrl).toBe('/')
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual(['/__xrift/world-items'])
    vi.unstubAllGlobals()
  })

  it('ローカルのアイテムも xrift.json の宣言に無ければ本番と同じ NOT_DECLARED で止める', async () => {
    const Local = () => null
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ items: ['ITEM-1'] })))
    const loader = createDevItemLoader({ items: { 'item-1': Local, 'item-2': Local } })

    // 宣言は大文字小文字を区別しない
    expect((await loader.load('item-1')).Item).toBe(Local)
    await expect(loader.load('item-2')).rejects.toMatchObject({ code: 'NOT_DECLARED' })
    vi.unstubAllGlobals()
  })

  it('宣言の一覧が取れないとき（中継が無い・古い sdk）はローカルのアイテムをそのまま返す', async () => {
    const Local = () => null
    // 中継が無い: Vite の index.html
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    )
    expect((await createDevItemLoader({ items: { 'item-1': Local } }).load('item-1')).Item).toBe(Local)
    // 古い sdk: /world-items を知らず「中継しないパス」の 404 JSON
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: '中継しないパスです' }, 404)))
    expect((await createDevItemLoader({ items: { 'item-1': Local } }).load('item-1')).Item).toBe(Local)
    vi.unstubAllGlobals()
  })

  it('xrift.json が壊れていると中継が伝えてきたら、黙って通さず LOAD_FAILED で止める', async () => {
    const Local = () => null
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ code: 'LOAD_FAILED', error: 'xrift.json が読めません: items に不正な id' }, 500)),
    )
    await expect(createDevItemLoader({ items: { 'item-1': Local } }).load('item-1')).rejects.toMatchObject({
      code: 'LOAD_FAILED',
      message: 'xrift.json が読めません: items に不正な id',
    })
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
