import { Children, memo, useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { Content } from '@react-three/uikit'
import { Content as VanillaContent } from '@pmndrs/uikit'
import { Text as TroikaTextMesh, preloadFont } from 'troika-three-text'
import { suspend } from 'suspend-react'
import { useThree } from '@react-three/fiber'
import type { Props } from './types'

const DEFAULT_FONT_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf'

export type { Props as TroikaTextProps }

export const TroikaText = memo(
  ({
    children,
    fontSize = 16,
    color,
    font,
    maxWidth,
    textAlign,
    lineHeight,
    letterSpacing,
    anchorX = 'left',
    anchorY = 'top',
    ...contentProps
  }: Props) => {
    const resolvedFont = font ?? DEFAULT_FONT_URL
    const contentRef = useRef<VanillaContent>(null)
    const invalidate = useThree(({ invalidate }) => invalidate)

    const [troikaMesh] = useState(() => new TroikaTextMesh())

    // フォントプリロード（Suspense 対応 — drei と同じパターン）
    suspend(
      () =>
        new Promise<void>((res) =>
          preloadFont({ font: resolvedFont }, () => res()),
        ),
      ['troika-font', resolvedFont],
    )

    // children からテキスト文字列を抽出（drei と同じパターン）
    const text = useMemo(() => {
      let t = ''
      Children.forEach(children, (child) => {
        if (typeof child === 'string' || typeof child === 'number') t += child
      })
      return t
    }, [children])

    // troika プロパティを設定して sync（毎レンダリング）
    useLayoutEffect(() => {
      troikaMesh.text = text
      troikaMesh.font = resolvedFont
      troikaMesh.fontSize = fontSize
      if (color != null) troikaMesh.color = color as number
      if (maxWidth != null) troikaMesh.maxWidth = maxWidth
      if (textAlign != null) troikaMesh.textAlign = textAlign
      if (lineHeight != null) troikaMesh.lineHeight = lineHeight
      if (letterSpacing != null) troikaMesh.letterSpacing = letterSpacing
      troikaMesh.anchorX = anchorX
      troikaMesh.anchorY = anchorY

      troikaMesh.sync(() => {
        invalidate()
        contentRef.current?.notifyAncestorsChanged()
      })
    })

    useEffect(() => () => troikaMesh.dispose(), [troikaMesh])

    return (
      <Content ref={contentRef} keepAspectRatio={false} {...contentProps}>
        <primitive object={troikaMesh} />
      </Content>
    )
  },
)

TroikaText.displayName = 'TroikaText'
