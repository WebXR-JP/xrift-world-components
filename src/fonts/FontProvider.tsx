import { memo, useMemo, useState, useEffect, type ReactNode } from 'react'
import { Container, Text } from '@react-three/uikit'
import { FontContext } from './FontContext'
import { useMsdfFont } from '../hooks/useMsdfFont'

interface Props {
  /** MSDF 生成に含めるテキスト配列。安定した参照の配列を渡すことを推奨。 */
  texts: string[]
  children: ReactNode
  /** フォント URL（デフォルト: Noto Sans JP Regular） */
  fontUrl?: string
  /** MSDF テクスチャサイズ（デフォルト: [2048, 2048]） */
  textureSize?: [number, number]
}

/**
 * ツリー全体で MSDF アトラスを共有し、配下で日本語テキストを直接使えるようにする Provider。
 *
 * `texts` に含まれる文字から MSDF フォントを1回だけ生成し、
 * `fontFamilies` を Container 経由で配下に適用する。
 * Suspense 対応のため、親に `<Suspense>` が必要。
 *
 * @example
 * ```tsx
 * const ALL_TEXTS = ['URLを入力してください', '再接続中...']
 *
 * <Suspense fallback={null}>
 *   <FontProvider texts={ALL_TEXTS}>
 *     <Text fontSize={48}>URLを入力してください</Text>
 *   </FontProvider>
 * </Suspense>
 * ```
 */
export const FontProvider = memo(
  ({ texts, fontUrl, textureSize, children }: Props) => {
    const fontFamilies = useMsdfFont(texts, fontUrl, textureSize)
    const value = useMemo(() => ({ fontFamilies }), [fontFamilies])

    // uikit はフォントテクスチャを非同期でロードするため、
    // 初回レンダリングでデフォルトの inter フォントへフォールバックし
    // "Missing glyph info" 警告が出る。スペースのみの Text で
    // フォントロードをトリガーし、次フレームで children を表示する。
    const [fontReady, setFontReady] = useState(false)
    useEffect(() => {
      setFontReady(false)
      const id = requestAnimationFrame(() => setFontReady(true))
      return () => cancelAnimationFrame(id)
    }, [fontFamilies])

    return (
      <FontContext.Provider value={value}>
        <Container fontFamilies={fontFamilies}>
          {fontReady ? children : <Text fontSize={1}>{' '}</Text>}
        </Container>
      </FontContext.Provider>
    )
  },
)

FontProvider.displayName = 'FontProvider'
