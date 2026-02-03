import { describe, it, expect } from 'vitest'
import { isHlsUrl, appendCacheKey } from './utils'

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
