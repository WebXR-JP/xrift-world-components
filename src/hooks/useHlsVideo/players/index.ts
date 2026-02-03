import { canPlayHlsNatively } from '../utils'
import { HlsJsPlayer } from './HlsJsPlayer'
import { NativeHlsPlayer } from './NativeHlsPlayer'
import type { HlsPlayerStrategy, HlsPlayerOptions } from './types'

export type { HlsPlayerStrategy, HlsPlayerCallbacks, HlsPlayerOptions } from './types'
export { HlsJsPlayer } from './HlsJsPlayer'
export { NativeHlsPlayer } from './NativeHlsPlayer'

export type CreatePlayerResult =
  | { player: HlsPlayerStrategy; type: 'hlsjs' | 'native' }
  | { player: null; type: 'unsupported'; error: Error }

/**
 * 環境に応じて適切な HLS プレイヤーを作成
 * hls.js を優先し、利用できない場合はネイティブ HLS にフォールバック
 */
export async function createHlsPlayer(
  options: HlsPlayerOptions
): Promise<CreatePlayerResult> {
  // hls.js を優先
  try {
    const Hls = (await import('hls.js')).default

    if (Hls.isSupported()) {
      return {
        player: new HlsJsPlayer(Hls, options),
        type: 'hlsjs',
      }
    }
  } catch (err) {
    console.warn('[createHlsPlayer] Failed to load hls.js:', err)
  }

  // ネイティブ HLS にフォールバック
  if (canPlayHlsNatively()) {
    return {
      player: new NativeHlsPlayer(options),
      type: 'native',
    }
  }

  return {
    player: null,
    type: 'unsupported',
    error: new Error('HLS playback is not supported in this browser'),
  }
}
