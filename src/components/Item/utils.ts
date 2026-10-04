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

/**
 * 配置の id を itemId と置き方から決める（全クライアントで同じ値になる）
 *
 * useItem().id はアイテムが useInstanceState のキーなどに使う（「設置者だけが操作できる」等）。
 * React の useId はツリー上の位置から決まるので、VR と PC で描画が分岐するワールドでは
 * 人ごとにずれ、同じアイテムの共有状態が別物になる。置き方から組めば誰が見ても同じになる。
 * 同じアイテムを同じ場所に2つ重ねるときは id プロップで明示する
 */
export function defaultPlacementId(
  itemId: string,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number],
  scale: number,
): string {
  return `item:${itemId}:${position.join(',')}:${rotation.join(',')}:${scale}`
}
