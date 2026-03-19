import { useMemo } from 'react'
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

export const useJapaneseFont = (texts: string[]) => {
  const input = useMemo<TTFInputItem[]>(
    () => [
      {
        url: JAPANESE_FONT_URL,
        charset: deriveCharset(texts),
        textureSize: JAPANESE_TEXTURE_SIZE,
      },
    ],
    [texts]
  )
  return useTTF(input)
}
