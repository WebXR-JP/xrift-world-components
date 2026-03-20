import { memo, Suspense, useMemo } from 'react'
import { Text, type TextProperties } from '@react-three/uikit'
import { FontReadyContainer } from '../../fonts/FontReadyContainer'

type TextProps = TextProperties

interface Props extends Omit<TextProps, 'children'> {
  children: string
  /** フォント URL（デフォルト: Noto Sans JP Regular） */
  fontUrl?: string
  /** MSDF テクスチャサイズ（デフォルト: [2048, 2048]） */
  textureSize?: [number, number]
}

const InnerText = memo(
  ({
    children,
    fontUrl,
    textureSize,
    ...textProps
  }: Props) => {
    const texts = useMemo(() => [children], [children])

    return (
      <FontReadyContainer texts={texts} fontUrl={fontUrl} textureSize={textureSize}>
        <Text {...textProps}>{children}</Text>
      </FontReadyContainer>
    )
  },
)

InnerText.displayName = 'MsdfText.Inner'

/**
 * MSDF フォントで日本語テキストを表示するコンポーネント。
 * children の文字列から必要な文字セットを自動導出し、
 * フォント読み込み・Suspense を内部で処理する。
 *
 * @example
 * ```tsx
 * <MsdfText fontSize={48} color={0x666666}>
 *   URLを入力してください
 * </MsdfText>
 * ```
 */
export const MsdfText = memo((props: Props) => (
  <Suspense fallback={null}>
    <InnerText {...props} />
  </Suspense>
))

MsdfText.displayName = 'MsdfText'
