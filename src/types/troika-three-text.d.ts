declare module 'troika-three-text' {
  import { Mesh, Color, Material } from 'three'

  export class Text extends Mesh {
    text: string
    font: string | null
    fontSize: number
    color: string | number | Color | null
    maxWidth: number
    textAlign: 'left' | 'right' | 'center' | 'justify'
    anchorX: number | 'left' | 'center' | 'right'
    anchorY:
      | number
      | 'top'
      | 'top-baseline'
      | 'middle'
      | 'bottom-baseline'
      | 'bottom'
    letterSpacing: number
    lineHeight: number | 'normal'
    whiteSpace: 'normal' | 'nowrap'
    overflowWrap: 'normal' | 'break-word'
    direction: 'auto' | 'ltr' | 'rtl'
    fontWeight: number | 'normal' | 'bold'
    fontStyle: 'normal' | 'italic'
    outlineWidth: number | string
    outlineColor: string | number | Color
    outlineOpacity: number
    fillOpacity: number
    sdfGlyphSize: number
    material: Material | null
    depthOffset: number
    clipRect: [number, number, number, number] | null
    sync(callback?: () => void): void
    dispose(): void
  }

  export function preloadFont(
    options: { font?: string | null; characters?: string | string[] },
    callback?: () => void,
  ): void
}
