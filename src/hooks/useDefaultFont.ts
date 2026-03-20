import type { FontFamilies } from '@pmndrs/uikit'
import { useEffect, useState } from 'react'

export type FontLocale = 'ja'

type FontConfig = {
  baseUrl: string
  version: number
}

const FONT_REGISTRY: Record<FontLocale, FontConfig> = {
  ja: {
    baseUrl: 'https://public.xrift.net/fonts/msdf/NotoSansJP',
    version: 2,
  },
}

async function loadFont(
  locale: FontLocale,
): Promise<[string, FontFamilies[string]]> {
  const config = FONT_REGISTRY[locale]
  const url = `${config.baseUrl}/metrics.json?v=${config.version}`
  const res = await fetch(url)
  const metrics = await res.json()
  metrics.pages = [`${config.baseUrl}/atlas.png?v=${config.version}`]
  return [locale, { normal: metrics }]
}

/**
 * UIKit 用の多言語 MSDF フォントをロードする hook
 *
 * @param locales - ロードするフォントのロケール配列
 * @returns ロード完了後に FontFamilies を返す。ロード中は undefined
 *
 * @example
 * ```tsx
 * const fontFamilies = useDefaultFont(['ja'])
 *
 * return (
 *   <Container fontFamilies={fontFamilies}>
 *     <Text fontFamily="ja">こんにちは</Text>
 *   </Container>
 * )
 * ```
 */
export function useDefaultFont(
  locales: FontLocale[],
): FontFamilies | undefined {
  const [fontFamilies, setFontFamilies] = useState<FontFamilies | undefined>()
  const key = locales.slice().sort().join(',')

  useEffect(() => {
    if (key === '') return

    let cancelled = false
    const targetLocales = key.split(',') as FontLocale[]

    Promise.all(targetLocales.map(loadFont)).then((entries) => {
      if (!cancelled) {
        setFontFamilies(Object.fromEntries(entries))
      }
    })

    return () => {
      cancelled = true
    }
  }, [key])

  return fontFamilies
}
