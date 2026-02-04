/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isHlsUrl, appendCacheKey, canPlayHlsNatively, createVideoTexture } from '../utils'

describe('isHlsUrl', () => {
  it('.m3u8 を含む URL は true', () => {
    expect(isHlsUrl('https://example.com/video.m3u8')).toBe(true)
  })

  it('.m3u8 をクエリパラメータ前に含む URL は true', () => {
    expect(isHlsUrl('https://example.com/video.m3u8?token=abc')).toBe(true)
  })

  it('application/vnd.apple.mpegurl を含む URL は true', () => {
    expect(isHlsUrl('https://example.com/video?type=application/vnd.apple.mpegurl')).toBe(true)
  })

  it('.mp4 URL は false', () => {
    expect(isHlsUrl('https://example.com/video.mp4')).toBe(false)
  })

  it('.webm URL は false', () => {
    expect(isHlsUrl('https://example.com/video.webm')).toBe(false)
  })

  it('空文字は false', () => {
    expect(isHlsUrl('')).toBe(false)
  })
})

describe('appendCacheKey', () => {
  it('クエリパラメータがない URL に _ck を追加', () => {
    expect(appendCacheKey('https://example.com/video.m3u8', 123)).toBe(
      'https://example.com/video.m3u8?_ck=123'
    )
  })

  it('既存のクエリパラメータがある URL に _ck を追加', () => {
    expect(appendCacheKey('https://example.com/video.m3u8?token=abc', 456)).toBe(
      'https://example.com/video.m3u8?token=abc&_ck=456'
    )
  })

  it('cacheKey が 0 の場合も正しく追加', () => {
    expect(appendCacheKey('https://example.com/video.m3u8', 0)).toBe(
      'https://example.com/video.m3u8?_ck=0'
    )
  })
})

describe('canPlayHlsNatively', () => {
  it('video.canPlayType が空文字を返す場合は false', () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        vi.spyOn(element as HTMLVideoElement, 'canPlayType').mockReturnValue('')
      }
      return element
    })

    expect(canPlayHlsNatively()).toBe(false)

    vi.restoreAllMocks()
  })

  it('video.canPlayType が "maybe" を返す場合は true', () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        vi.spyOn(element as HTMLVideoElement, 'canPlayType').mockReturnValue('maybe')
      }
      return element
    })

    expect(canPlayHlsNatively()).toBe(true)

    vi.restoreAllMocks()
  })

  it('video.canPlayType が "probably" を返す場合は true', () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        vi.spyOn(element as HTMLVideoElement, 'canPlayType').mockReturnValue('probably')
      }
      return element
    })

    expect(canPlayHlsNatively()).toBe(true)

    vi.restoreAllMocks()
  })
})

describe('createVideoTexture', () => {
  it('video 要素と VideoTexture を返す', () => {
    const result = createVideoTexture()

    expect(result.video).toBeInstanceOf(HTMLVideoElement)
    expect(result.texture).toBeDefined()
  })

  it('video 要素に正しい属性が設定される', () => {
    const { video } = createVideoTexture()

    expect(video.crossOrigin).toBe('anonymous')
    expect(video.playsInline).toBe(true)
    expect(video.muted).toBe(false)
  })

  it('texture に正しいフィルター設定がされる', () => {
    const { texture } = createVideoTexture()

    // LinearFilter = 1006 in Three.js
    expect(texture.minFilter).toBe(1006)
    expect(texture.magFilter).toBe(1006)
  })
})

describe('createHlsPlayer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hls.js がサポートされている場合は HlsJsPlayer を返す', async () => {
    vi.doMock('hls.js', () => ({
      default: class MockHls {
        static isSupported = () => true
        static Events = {
          ERROR: 'hlsError',
          FRAG_BUFFERED: 'hlsFragBuffered',
          MANIFEST_PARSED: 'hlsManifestParsed',
        }
        static ErrorTypes = {
          MEDIA_ERROR: 'mediaError',
          NETWORK_ERROR: 'networkError',
        }
        on = vi.fn()
        attachMedia = vi.fn()
        loadSource = vi.fn()
        destroy = vi.fn()
      },
    }))

    const { createHlsPlayer } = await import('../utils')
    const { RecoveryTracker } = await import('../classes/RecoveryTracker')

    const result = await createHlsPlayer({
      video: document.createElement('video'),
      tracker: new RecoveryTracker(),
      callbacks: {},
    })

    expect(result.type).toBe('hlsjs')
    expect(result.player).not.toBeNull()
  })

  it('hls.js がサポートされていない & ネイティブ HLS 対応の場合は NativeHlsPlayer を返す', async () => {
    vi.doMock('hls.js', () => ({
      default: class MockHls {
        static isSupported = () => false
      },
    }))

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        vi.spyOn(element as HTMLVideoElement, 'canPlayType').mockReturnValue('maybe')
      }
      return element
    })

    const { createHlsPlayer } = await import('../utils')
    const { RecoveryTracker } = await import('../classes/RecoveryTracker')

    const result = await createHlsPlayer({
      video: document.createElement('video'),
      tracker: new RecoveryTracker(),
      callbacks: {},
    })

    expect(result.type).toBe('native')
    expect(result.player).not.toBeNull()
  })

  it('どちらもサポートされていない場合は unsupported を返す', async () => {
    vi.doMock('hls.js', () => ({
      default: class MockHls {
        static isSupported = () => false
      },
    }))

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName)
      if (tagName === 'video') {
        vi.spyOn(element as HTMLVideoElement, 'canPlayType').mockReturnValue('')
      }
      return element
    })

    const { createHlsPlayer } = await import('../utils')
    const { RecoveryTracker } = await import('../classes/RecoveryTracker')

    const result = await createHlsPlayer({
      video: document.createElement('video'),
      tracker: new RecoveryTracker(),
      callbacks: {},
    })

    expect(result.type).toBe('unsupported')
    expect(result.player).toBeNull()
    if (result.type === 'unsupported') {
      expect(result.error).toBeInstanceOf(Error)
    }
  })
})
