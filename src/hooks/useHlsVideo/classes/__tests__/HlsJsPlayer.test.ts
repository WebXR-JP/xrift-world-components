/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HlsJsPlayer } from '../HlsJsPlayer'
import { RecoveryTracker } from '../RecoveryTracker'

// hls.js のモック
function createMockHls() {
  const eventHandlers: Record<string, Function> = {}

  const mockHlsInstance = {
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers[event] = handler
    }),
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    destroy: vi.fn(),
    recoverMediaError: vi.fn(),
    startLoad: vi.fn(),
    // イベントをトリガーするヘルパー
    _trigger: (event: string, ...args: unknown[]) => {
      eventHandlers[event]?.(...args)
    },
  }

  // コンストラクタ関数として使えるクラスを作成
  class MockHlsClass {
    on = mockHlsInstance.on
    loadSource = mockHlsInstance.loadSource
    attachMedia = mockHlsInstance.attachMedia
    destroy = mockHlsInstance.destroy
    recoverMediaError = mockHlsInstance.recoverMediaError
    startLoad = mockHlsInstance.startLoad

    constructor(_config: unknown) {
      // コンストラクタの引数は無視
    }

    static Events = {
      ERROR: 'hlsError',
      FRAG_BUFFERED: 'hlsFragBuffered',
      MANIFEST_PARSED: 'hlsManifestParsed',
    }

    static ErrorTypes = {
      MEDIA_ERROR: 'mediaError',
      NETWORK_ERROR: 'networkError',
      OTHER_ERROR: 'otherError',
    }
  }

  return { MockHlsClass: MockHlsClass as unknown as typeof import('hls.js').default, mockHlsInstance }
}

describe('HlsJsPlayer', () => {
  let video: HTMLVideoElement
  let tracker: RecoveryTracker

  beforeEach(() => {
    video = document.createElement('video')
    tracker = new RecoveryTracker()
  })

  it('初期化時に attachMedia が呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()

    new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: {},
    })

    expect(mockHlsInstance.attachMedia).toHaveBeenCalledWith(video)
  })

  it('load で loadSource が呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()

    const player = new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: {},
    })

    player.load('https://example.com/video.m3u8')
    expect(mockHlsInstance.loadSource).toHaveBeenCalledWith('https://example.com/video.m3u8')
  })

  it('destroy で hls.destroy が呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()

    const player = new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: {},
    })

    player.destroy()
    expect(mockHlsInstance.destroy).toHaveBeenCalled()
  })

  it('MANIFEST_PARSED イベントで onManifestParsed コールバックが呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()
    const onManifestParsed = vi.fn()

    new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: { onManifestParsed },
    })

    mockHlsInstance._trigger('hlsManifestParsed')
    expect(onManifestParsed).toHaveBeenCalled()
  })

  it('FRAG_BUFFERED イベントで onBufferingChange(false) が呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()
    const onBufferingChange = vi.fn()

    new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: { onBufferingChange },
    })

    mockHlsInstance._trigger('hlsFragBuffered')
    expect(onBufferingChange).toHaveBeenCalledWith(false)
  })

  it('非致命的エラーは無視される', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()
    const onError = vi.fn()

    new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: { onError },
    })

    mockHlsInstance._trigger('hlsError', {}, { fatal: false, details: 'someError' })
    expect(onError).not.toHaveBeenCalled()
  })

  it('MEDIA_ERROR 時に recoverMediaError が呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()

    new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: {},
    })

    mockHlsInstance._trigger('hlsError', {}, {
      fatal: true,
      type: 'mediaError',
      details: 'bufferStalledError',
    })

    expect(mockHlsInstance.recoverMediaError).toHaveBeenCalled()
  })

  it('NETWORK_ERROR 時に startLoad が呼ばれる', () => {
    const { MockHlsClass, mockHlsInstance } = createMockHls()

    new HlsJsPlayer(MockHlsClass, {
      video,
      tracker,
      callbacks: {},
    })

    mockHlsInstance._trigger('hlsError', {}, {
      fatal: true,
      type: 'networkError',
      details: 'networkError',
    })

    expect(mockHlsInstance.startLoad).toHaveBeenCalled()
  })
})
