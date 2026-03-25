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

/** ロケールごとのキャッシュ（同じフォントの重複フェッチを防止） */
const fontCache = new Map<FontLocale, Promise<[string, FontFamilies[string]]>>()

/** 解決済みフォントデータのキャッシュ（同期アクセス用） */
const resolvedCache = new Map<string, FontFamilies>()

function loadFont(
  locale: FontLocale,
): Promise<[string, FontFamilies[string]]> {
  const cached = fontCache.get(locale)
  if (cached) return cached

  const config = FONT_REGISTRY[locale]
  const url = `${config.baseUrl}/metrics.json?v=${config.version}`
  const promise = fetch(url)
    .then((res) => res.json())
    .then((metrics) => {
      metrics.pages = [`${config.baseUrl}/atlas.png?v=${config.version}`]
      return [locale, { normal: metrics }] as [string, FontFamilies[string]]
    })

  fontCache.set(locale, promise)
  return promise
}

// モジュール読み込み時にフォントのフェッチを開始
for (const locale of Object.keys(FONT_REGISTRY) as FontLocale[]) {
  loadFont(locale)
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
  const key = locales.slice().sort().join(',')

  // 解決済みなら初期値として同期的に返す
  const [fontFamilies, setFontFamilies] = useState<FontFamilies | undefined>(
    () => resolvedCache.get(key),
  )

  useEffect(() => {
    if (key === '') return

    // すでに解決済みなら何もしない
    if (resolvedCache.has(key)) {
      setFontFamilies(resolvedCache.get(key))
      return
    }

    let cancelled = false
    const targetLocales = key.split(',') as FontLocale[]

    Promise.all(targetLocales.map(loadFont)).then((entries) => {
      if (cancelled) return
      const result = Object.fromEntries(entries)
      resolvedCache.set(key, result)
      setFontFamilies(result)
    })

    return () => {
      cancelled = true
    }
  }, [key])

  return fontFamilies
}
