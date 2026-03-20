import { memo, useState, useEffect, type ComponentProps, type ReactNode } from 'react'
import { Container, Text } from '@react-three/uikit'
import { useMsdfFont } from '../hooks/useMsdfFont'

type ContainerProps = ComponentProps<typeof Container>

interface Props extends Omit<ContainerProps, 'children'> {
  /** MSDF 生成に含めるテキスト配列。安定した参照の配列を渡すことを推奨。 */
  texts: string[]
  children: ReactNode
  /** フォント URL（デフォルト: Noto Sans JP Regular） */
  fontUrl?: string
  /** MSDF テクスチャサイズ（デフォルト: [2048, 2048]） */
  textureSize?: [number, number]
}

/**
 * 日本語 MSDF フォントの読み込み・ロード待ちを内包した Container。
 *
 * `texts` に含まれる文字からフォントを生成し、
 * テクスチャのロードが完了してから children を表示する。
 * Suspense 対応のため、親に `<Suspense>` が必要。
 *
 * @example
 * ```tsx
 * const TEXTS = ['URLを入力してください']
 *
 * <Suspense fallback={null}>
 *   <FontReadyContainer texts={TEXTS} sizeX={4} backgroundColor={0x000000}>
 *     <Text fontSize={48}>URLを入力してください</Text>
 *   </FontReadyContainer>
 * </Suspense>
 * ```
 */
export const FontReadyContainer = memo(
  ({ texts, children, fontUrl, textureSize, ...containerProps }: Props) => {
    const fontFamilies = useMsdfFont(texts, fontUrl, textureSize)

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
      <Container fontFamilies={fontFamilies} {...containerProps}>
        {fontReady ? children : <Text fontSize={1}>{' '}</Text>}
      </Container>
    )
  },
)

FontReadyContainer.displayName = 'FontReadyContainer'
