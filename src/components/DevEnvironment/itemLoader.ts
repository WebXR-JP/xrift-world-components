import type { ComponentType } from 'react'
import {
  type ItemComponentProps,
  ItemLoadError,
  type ItemLoaderContextValue,
  type LoadedItem,
} from '../../contexts/ItemLoaderContext'
import { buildDevShareScope } from './shareScope'

/** 開発サーバー側（@xrift/sdk の Vite プラグイン）が API を中継するパス */
export const DEV_ITEM_API_PREFIX = '/__xrift'

/** itemId → ローカルのアイテムコンポーネント（表か、都度引く関数） */
export type LocalItems =
  | Record<string, ComponentType<ItemComponentProps>>
  | ((itemId: string) => ComponentType<ItemComponentProps> | undefined)

export interface DevItemLoaderOptions {
  /**
   * ローカルのアイテムコンポーネント。アイテムとワールドを同時に作っているとき・
   * まだアップロードしていないときに、本番の代わりに手元のソースを差し込む。
   * 関数を渡すと呼び出しのたびに引く（ローダーを作り直さずに表の差し替えに追従できる）
   */
  items?: LocalItems
  /** 中継先のパス（既定 '/__xrift'） */
  apiPrefix?: string
}

/** 中継 API（GET /__xrift/items/:id/resolve）の応答 */
interface ResolveResponse {
  sceneUrl: string | null
  name?: string
  status?: string
}

/** 中継が JSON の本文で返す理由（@xrift/sdk の xriftDev が付ける） */
interface ResolveErrorBody {
  code?: unknown
  error?: unknown
}

/** 本文の code として受け付ける理由。中継（開発サーバー）が本番と同じ理由を伝えてくるときに使う */
const BODY_ERROR_CODES = ['NOT_DECLARED', 'NOT_FOUND', 'FORBIDDEN', 'LOGIN_REQUIRED'] as const
type BodyErrorCode = (typeof BODY_ERROR_CODES)[number]

function isBodyErrorCode(value: unknown): value is BodyErrorCode {
  return typeof value === 'string' && (BODY_ERROR_CODES as readonly string[]).includes(value)
}

/**
 * HTTP の失敗を ItemLoadError にする
 *
 * 本文に code があればそれを優先する（中継が「xrift.json に宣言されていない」のように、
 * HTTP の状態だけでは区別できない理由を伝えてくるため）。無ければ status から決める
 */
export function errorFromResolveStatus(
  status: number,
  isProxyMissing: boolean,
  body?: ResolveErrorBody,
): ItemLoadError {
  if (isProxyMissing) {
    return new ItemLoadError(
      'NOT_AVAILABLE',
      'アイテムを読む中継（/__xrift）がありません。vite.config に @xrift/sdk/vite の xriftDev() を追加してください',
    )
  }
  if (body && isBodyErrorCode(body.code) && typeof body.error === 'string' && body.error !== '') {
    return new ItemLoadError(body.code, body.error)
  }
  if (status === 401) {
    return new ItemLoadError('LOGIN_REQUIRED', 'ログインが必要です（xrift login を実行してください）')
  }
  if (status === 403) {
    return new ItemLoadError('FORBIDDEN', 'このアイテムを使う権利がありません（自作かライブラリに入れたものだけ使えます）')
  }
  if (status === 404) {
    return new ItemLoadError('NOT_FOUND', 'アイテムが見つかりません')
  }
  return new ItemLoadError('LOAD_FAILED', `アイテムの解決に失敗しました（HTTP ${status}）`)
}

/** 失敗応答の JSON 本文（読めなければ undefined。理由は status から決める） */
async function readErrorBody(response: Response, isJson: boolean): Promise<ResolveErrorBody | undefined> {
  if (!isJson) return undefined
  try {
    const body: unknown = await response.json()
    return body !== null && typeof body === 'object' ? (body as ResolveErrorBody) : undefined
  } catch {
    return undefined
  }
}

/**
 * Module Federation のバンドル（remoteEntry.js）からアイテム本体を取り出す
 *
 * xrift-frontend の loadItemModule と同じ手順。共有依存はこのワールドプロジェクトのものを渡す
 */
async function loadFederatedItem(sceneUrl: string): Promise<LoadedItem> {
  const container = await import(/* @vite-ignore */ sceneUrl)
  await container.init(await buildDevShareScope())
  const factory = await container.get('./Item')
  const module = factory() as { Item?: ComponentType<ItemComponentProps> }
  if (!module.Item) {
    throw new ItemLoadError('LOAD_FAILED', 'バンドルに Item コンポーネントがありません')
  }
  return { Item: module.Item, sceneUrl }
}

/**
 * ローカル開発（DevEnvironment）用のアイテム読み込み
 *
 * 1. `items` に差し込まれていればそれ（ローカルのソース）
 * 2. 開発サーバーの中継（/__xrift/items/:id/resolve。CLI トークンを付けてくれる）で配信 URL を解決し、
 *    本番と同じバンドルを読む
 *
 * 結果は itemId ごとにキャッシュする（同じアイテムを何個置いても読み込みは1回）。
 * 失敗は覚えない（ログイン後にリロードせず置き直せるように）
 */
export function createDevItemLoader(options: DevItemLoaderOptions = {}): ItemLoaderContextValue {
  const { items, apiPrefix = DEV_ITEM_API_PREFIX } = options
  const resolveLocal = (itemId: string) =>
    typeof items === 'function' ? items(itemId) : items?.[itemId]
  const cache = new Map<string, Promise<LoadedItem>>()

  const resolveAndLoad = async (itemId: string): Promise<LoadedItem> => {
    const local = resolveLocal(itemId)
    if (local) return { Item: local, sceneUrl: '/' }

    const response = await fetch(`${apiPrefix}/items/${encodeURIComponent(itemId)}/resolve`, {
      headers: { Accept: 'application/json' },
    })
    // 中継が無いと Vite が 404 のテキストや index.html（text/html）を返す。API の応答は必ず JSON
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
    if (!response.ok || !isJson) {
      throw errorFromResolveStatus(response.status, !isJson, await readErrorBody(response, isJson))
    }
    const resolved = (await response.json()) as ResolveResponse
    if (!resolved.sceneUrl) {
      throw new ItemLoadError(
        'NOT_FOUND',
        resolved.status === 'PENDING'
          ? 'このアイテムは審査中です'
          : 'このアイテムは読めません（審査に通っていないか、版がありません）',
      )
    }
    return loadFederatedItem(resolved.sceneUrl)
  }

  return {
    load: (itemId) => {
      const cached = cache.get(itemId)
      if (cached) return cached
      const loading = resolveAndLoad(itemId).catch((error: unknown) => {
        cache.delete(itemId)
        throw error
      })
      cache.set(itemId, loading)
      return loading
    },
  }
}
