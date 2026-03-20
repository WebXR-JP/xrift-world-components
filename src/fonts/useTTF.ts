import { suspend } from 'suspend-react'
import type { GenerateFontResult } from '@zappar/msdf-generator'
import { loadTTF } from './loadTTF'

const cacheSymbol = Symbol('xrift-ttf')

/**
 * TTF フォントを MSDF 形式で読み込む Suspense 対応 hook。
 * static import 版の loadTTF を使用するため Triplex でも動作する。
 */
export const useTTF = (
  url: string,
  charset: string,
  textureSize?: [number, number],
): GenerateFontResult =>
  suspend(
    async (
      _key: symbol,
      url: string,
      charset: string,
      textureSize?: [number, number],
    ) => loadTTF({ url, charset, textureSize }),
    [cacheSymbol, url, charset, textureSize],
  )
