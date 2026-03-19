import { useMemo } from 'react'
// useTTF は @react-three/uikit のメインエントリに含まれないため dist/use-ttf から直接インポート
import { useTTF, type TTFInputItem } from '@react-three/uikit/dist/use-ttf'
import {
  JAPANESE_FONT_URL,
  JAPANESE_BASE_CHARSET,
  JAPANESE_TEXTURE_SIZE,
} from '../fonts/constants'

const deriveCharset = (texts: string[]): string => {
  const extra = [...new Set(texts.join(''))].join('')
  return JAPANESE_BASE_CHARSET + extra
}

/**
 * 日本語フォントを MSDF 形式で読み込む hook。
 * @param texts - 表示予定のテキスト配列。ここに含まれる漢字のみ MSDF 生成されるため、
 *                表示する全テキストを渡すこと。安定した参照の配列を渡すことを推奨。
 */
export const useJapaneseFont = (texts: string[]) => {
  const key = texts.join('\0')
  const input = useMemo<TTFInputItem[]>(
    () => [
      {
        url: JAPANESE_FONT_URL,
        charset: deriveCharset(texts),
        textureSize: JAPANESE_TEXTURE_SIZE,
      },
    ],
    [key]
  )
  return useTTF(input)
}
