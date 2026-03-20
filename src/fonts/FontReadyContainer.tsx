import { memo, useState, useEffect, type ComponentProps, type ReactNode } from 'react'
import { Container, Text } from '@react-three/uikit'
import type { GenerateFontResult } from '@zappar/msdf-generator'
import { useMsdfFont } from '../hooks/useMsdfFont'
import { useFontContext } from './FontContext'

type ContainerProps = ComponentProps<typeof Container>

interface Props extends Omit<ContainerProps, 'children'> {
  /**
   * MSDF 生成に含めるテキスト配列。安定した参照の配列を渡すことを推奨。
   * FontProvider 内で使用する場合は省略可能（Provider のアトラスを利用）。
   */
  texts?: string[]
  children: ReactNode
  /** フォント URL（デフォルト: Noto Sans JP Regular） */
  fontUrl?: string
  /** MSDF テクスチャサイズ（デフォルト: [2048, 2048]） */
  textureSize?: [number, number]
}

/** fontFamilies → fontReady 待ち → Container レンダリング */
const useDelayedFontReady = (fontFamilies: GenerateFontResult) => {
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => {
    setFontReady(false)
    const id = requestAnimationFrame(() => setFontReady(true))
    return () => cancelAnimationFrame(id)
  }, [fontFamilies])
  return fontReady
}

/**
 * useMsdfFont を呼んで Container をレンダリングする内部コンポーネント。
 * FontProvider が存在しない場合に FontReadyContainer から使われる。
 */
const FontReadyWithHook = memo(
  ({ texts, children, fontUrl, textureSize, ...containerProps }: Props & { texts: string[] }) => {
    const fontFamilies = useMsdfFont(texts, fontUrl, textureSize)
    const fontReady = useDelayedFontReady(fontFamilies)

    return (
      <Container fontFamilies={fontFamilies} {...containerProps}>
        {fontReady ? children : <Text fontSize={1}>{' '}</Text>}
      </Container>
    )
  },
)

FontReadyWithHook.displayName = 'FontReadyWithHook'

/**
 * Context の fontFamilies で Container をレンダリングする内部コンポーネント。
 * FontProvider 内で FontReadyContainer から使われる。
 */
const FontReadyWithContext = memo(
  ({ fontFamilies, children, ...containerProps }: Props & { fontFamilies: GenerateFontResult }) => {
    const fontReady = useDelayedFontReady(fontFamilies)

    return (
      <Container fontFamilies={fontFamilies} {...containerProps}>
        {fontReady ? children : <Text fontSize={1}>{' '}</Text>}
      </Container>
    )
  },
)

FontReadyWithContext.displayName = 'FontReadyWithContext'

/**
 * 日本語 MSDF フォントの読み込み・ロード待ちを内包した Container。
 *
 * `FontProvider` 内で使用する場合は Provider のアトラスを自動利用し、
 * `texts` を省略できる。Provider 外では `texts` を指定して自前で MSDF を生成する。
 * Suspense 対応のため、親に `<Suspense>` が必要。
 *
 * @example
 * ```tsx
 * // FontProvider 内（texts 省略可）
 * <FontProvider texts={ALL_TEXTS}>
 *   <FontReadyContainer sizeX={4}>
 *     <Text fontSize={48}>URLを入力してください</Text>
 *   </FontReadyContainer>
 * </FontProvider>
 *
 * // 単独使用（texts 必須）
 * <Suspense fallback={null}>
 *   <FontReadyContainer texts={TEXTS} sizeX={4}>
 *     <Text fontSize={48}>URLを入力してください</Text>
 *   </FontReadyContainer>
 * </Suspense>
 * ```
 */
export const FontReadyContainer = memo(
  ({ texts, children, fontUrl, textureSize, ...containerProps }: Props) => {
    const ctx = useFontContext()

    // Context あり & texts なし → Provider のアトラスを利用
    if (ctx && !texts) {
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <FontReadyWithContext fontFamilies={ctx.fontFamilies} {...(containerProps as any)}>
          {children}
        </FontReadyWithContext>
      )
    }

    // Context なし or texts あり → 自前で MSDF 生成
    if (!texts) {
      throw new Error(
        'FontReadyContainer: texts prop is required when used outside of FontProvider',
      )
    }

    return (
      <FontReadyWithHook
        texts={texts}
        fontUrl={fontUrl}
        textureSize={textureSize}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(containerProps as any)}
      >
        {children}
      </FontReadyWithHook>
    )
  },
)

FontReadyContainer.displayName = 'FontReadyContainer'
