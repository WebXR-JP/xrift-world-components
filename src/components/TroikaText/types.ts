import type { ReactNode } from 'react'
import type { ContentProperties } from '@react-three/uikit'
import type { ReactThreeFiber } from '@react-three/fiber'

/** ContentProperties と衝突するプロパティを除外（troika 用に再定義する） */
type ContentBaseProps = Omit<
  ContentProperties,
  | 'children'
  | 'color'
  | 'fontSize'
  | 'letterSpacing'
  | 'lineHeight'
  | 'textAlign'
  | 'anchorX'
  | 'anchorY'
>

export interface Props extends ContentBaseProps {
  children: ReactNode
  fontSize?: number
  color?: ReactThreeFiber.Color
  font?: string
  maxWidth?: number
  textAlign?: 'left' | 'right' | 'center' | 'justify'
  lineHeight?: number | 'normal'
  letterSpacing?: number
  anchorX?: number | 'left' | 'center' | 'right'
  anchorY?:
    | number
    | 'top'
    | 'top-baseline'
    | 'middle'
    | 'bottom-baseline'
    | 'bottom'
}
