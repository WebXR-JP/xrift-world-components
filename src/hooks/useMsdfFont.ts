import { useMemo } from 'react'
import { useTTF } from '../fonts/useTTF'
import {
  JAPANESE_FONT_URL,
  JAPANESE_TEXTURE_SIZE,
} from '../fonts/constants'

const deriveCharset = (texts: string[]): string =>
  [...new Set(texts.join(''))].join('')

/**
 * MSDF フォントを読み込む hook。
 * MsdfText を使わず uikit のレイアウトを自分で組みたい場合に使用する。
 *
 * @param texts - 表示予定のテキスト配列。ここに含まれる文字が MSDF 生成される。
 *                安定した参照の配列を渡すことを推奨。
 * @param fontUrl - フォント URL（デフォルト: Noto Sans JP Regular）
 * @param textureSize - MSDF テクスチャサイズ（デフォルト: [2048, 2048]）
 */
export const useMsdfFont = (
  texts: string[],
  fontUrl: string = JAPANESE_FONT_URL,
  textureSize: [number, number] = JAPANESE_TEXTURE_SIZE,
) => {
  const key = texts.join('\0')
  const charset = useMemo(() => deriveCharset(texts), [key])

  return useTTF(fontUrl, charset, textureSize)
}
