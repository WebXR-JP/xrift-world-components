import {
  type Object3D,
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

/** DevEnvironment の確認・文字入力の画面に付ける属性（中で押したキーで歩いたり掴んだりしない） */
export const DEV_OVERLAY_ATTRIBUTE = 'data-xrift-dev-overlay'

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
  const target = event.target as {
    tagName?: string
    isContentEditable?: boolean
    closest?: (selector: string) => unknown
  } | null
  if (!target) return true
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return false
  // 確認・文字入力の画面の中で押したキーは、画面の操作（Esc・Enter）に使う
  if (target.closest?.(`[${DEV_OVERLAY_ATTRIBUTE}]`)) return false
  return target.isContentEditable !== true
}

/**
 * 当たった物から親をたどり、Interactable の onInteract を呼ぶ。呼べたら true。
 * 画面中央のクロスヘア（クリック）と VR のコントローラー（トリガー）で共通
 */
export function invokeInteract(hit: Object3D | null): boolean {
  let node = hit
  while (node) {
    const userData = node.userData as { onInteract?: (id: string) => void; id?: string }
    if (typeof userData.onInteract === 'function') {
      userData.onInteract(userData.id ?? '')
      return true
    }
    node = node.parent
  }
  return false
}
