import { createContext, useContext, type ReactNode } from 'react'
import type { FontFamilies } from '@pmndrs/uikit'
import { useDefaultFont, type FontLocale } from '../hooks/useDefaultFont'

const FontContext = createContext<FontFamilies | null>(null)

const DEFAULT_LOCALES: FontLocale[] = ['ja']

interface Props {
  children: ReactNode
}

/**
 * フォントをプリロードし、ロード完了まで children をブロックする Provider。
 * XRiftProvider 内で使用される。
 */
export function FontProvider({ children }: Props) {
  const fontFamilies = useDefaultFont(DEFAULT_LOCALES)
  if (!fontFamilies) return null

  return <FontContext.Provider value={fontFamilies}>{children}</FontContext.Provider>
}

/**
 * ロード済みの FontFamilies を取得する hook。
 * FontProvider 内では即座に返し、外では useDefaultFont にフォールバックする。
 */
export function useFont(): FontFamilies | undefined {
  const ctx = useContext(FontContext)
  const fallback = useDefaultFont(DEFAULT_LOCALES)
  return ctx ?? fallback
}
