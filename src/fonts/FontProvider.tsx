import { memo, useMemo, type ReactNode } from 'react'
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
 * ツリー全体で1つの MSDF アトラスを共有するための Provider。
 *
 * `texts` に含まれる文字から MSDF フォントを1回だけ生成し、
 * 配下の `FontReadyContainer` が自動的にこのアトラスを利用する。
 * Suspense 対応のため、親に `<Suspense>` が必要。
 *
 * @example
 * ```tsx
 * const ALL_TEXTS = ['URLを入力してください', '再接続中...']
 *
 * <Suspense fallback={null}>
 *   <FontProvider texts={ALL_TEXTS}>
 *     <VideoPlayer id="v1" />
 *     <LiveVideoPlayer id="l1" />
 *   </FontProvider>
 * </Suspense>
 * ```
 */
export const FontProvider = memo(
  ({ texts, fontUrl, textureSize, children }: Props) => {
    const fontFamilies = useMsdfFont(texts, fontUrl, textureSize)
    const value = useMemo(() => ({ fontFamilies }), [fontFamilies])

    return (
      <FontContext.Provider value={value}>{children}</FontContext.Provider>
    )
  },
)

FontProvider.displayName = 'FontProvider'
