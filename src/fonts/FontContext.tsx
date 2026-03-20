import { createContext, useContext } from 'react'
import type { GenerateFontResult } from '@zappar/msdf-generator'

interface FontContextValue {
  fontFamilies: GenerateFontResult
}

export const FontContext = createContext<FontContextValue | null>(null)

/** FontProvider 内では fontFamilies を返し、Provider 外では null を返す */
export const useFontContext = (): FontContextValue | null =>
  useContext(FontContext)
