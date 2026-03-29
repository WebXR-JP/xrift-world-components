import type { ComponentProps, ReactNode } from 'react'
import type { FontFamilies } from '@pmndrs/uikit'
import { Container } from '@react-three/uikit'
import { PlaceholderScreen } from '../PlaceholderScreen'

interface Props extends Omit<ComponentProps<typeof Container>, 'fontFamilies'> {
  fontFamilies: FontFamilies | undefined
  width: number
  screenHeight: number
  children: ReactNode
}

/**
 * fontFamilies がロード済みなら Container を、未ロードなら PlaceholderScreen を表示するガードコンポーネント。
 * フォント未ロード時に日本語グリフの Missing glyph 警告が出るのを防ぐ。
 */
export function FontGuardedContainer({ fontFamilies, width, screenHeight, children, ...containerProps }: Props) {
  if (!fontFamilies) return <PlaceholderScreen width={width} screenHeight={screenHeight} color="#000000" />

  return (
    <Container fontFamilies={fontFamilies} {...containerProps}>
      {children}
    </Container>
  )
}
