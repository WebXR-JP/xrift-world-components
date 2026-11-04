import {
  FloatType,
  HalfFloatType,
  type TextureDataType,
  UnsignedByteType,
} from 'three'

const OUTPUT_BUFFER_TYPE_MAP: Record<string, TextureDataType> = {
  UnsignedByteType,
  HalfFloatType,
  FloatType,
}

export function toThreeOutputBufferType(value: string | null | undefined): TextureDataType | undefined {
  if (!value) return undefined
  return OUTPUT_BUFFER_TYPE_MAP[value]
}

/**
 * キー入力を操作として扱ってよいか（文字入力中ではないか）。
 * 入力欄・テキストエリア・編集できる要素で打っている間、IME の変換中、Cmd/Ctrl との組み合わせは操作にしない
 */
export function isGameKeyEvent(event: {
  metaKey: boolean
  ctrlKey: boolean
  isComposing: boolean
  target: EventTarget | null
}): boolean {
  if (event.metaKey || event.ctrlKey) return false
  if (event.isComposing) return false
  const target = event.target as { tagName?: string; isContentEditable?: boolean } | null
  if (!target) return true
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return false
  return target.isContentEditable !== true
}
