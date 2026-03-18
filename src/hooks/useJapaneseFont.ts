import { useTTF, type TTFInputItem } from '@react-three/uikit/dist/use-ttf'
import {
  JAPANESE_FONT_URL,
  JAPANESE_CHARSET,
  JAPANESE_TEXTURE_SIZE,
} from '../fonts/constants'

export const useJapaneseFont = (options?: { charset?: string }) => {
  const input: TTFInputItem[] = [
    {
      url: JAPANESE_FONT_URL,
      charset: options?.charset ?? JAPANESE_CHARSET,
      textureSize: JAPANESE_TEXTURE_SIZE,
    },
  ]
  return useTTF(input)
}
