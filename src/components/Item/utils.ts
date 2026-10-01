import type { ItemLoadErrorCode } from '../../contexts/ItemLoaderContext'

/** remoteEntry.js の URL から、アイテムが相対パスで読むアセットの基準（末尾 / 付き）を作る */
export function baseUrlFromSceneUrl(sceneUrl: string): string {
  const index = sceneUrl.lastIndexOf('/')
  return index === -1 ? '/' : sceneUrl.substring(0, index + 1)
}

/**
 * 仮の箱に出す短い説明（英数字のみ。drei の既定フォントは日本語を持たない）
 */
export function placeholderLabel(status: 'loading' | 'error', code?: ItemLoadErrorCode): string {
  if (status === 'loading') return 'Item: loading...'
  switch (code) {
    case 'NOT_DECLARED':
      return 'Item: not declared in xrift.json'
    case 'LOGIN_REQUIRED':
      return 'Item: run `xrift login`'
    case 'FORBIDDEN':
      return 'Item: no permission'
    case 'NOT_FOUND':
      return 'Item: not found'
    case 'NOT_AVAILABLE':
      return 'Item: loader not available'
    default:
      return 'Item: failed to load'
  }
}
