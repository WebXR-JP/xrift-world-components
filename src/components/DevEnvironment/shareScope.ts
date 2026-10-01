/**
 * Module Federation の共有スコープ（ローカル開発用）
 *
 * アイテムのバンドルは react / three / fiber などをホストから受け取る前提でビルドされている
 * （requiredVersion は '*'。版キーは何でもよい）。xrift-frontend が本番で渡す表と同じ形を、
 * このワールドプロジェクトにインストールされている実体で組む。
 *
 * ワールド側に入っていないもの（rapier を使わないワールドなど）は入れない。アイテムがそれを
 * 使っていれば自分の同梱分を読みに行き、配信されていないので失敗する（本番と同じ挙動）
 */

type SharedModuleEntry = {
  get: () => Promise<() => unknown>
  loaded: boolean
  scope: string
}

export type ShareScope = Record<string, Record<string, SharedModuleEntry>>

const VERSION_KEY = '0.0.0'

/** 共有する名前と、それを読む方法。失敗したら（入っていなければ）飛ばす */
const SHARED_IMPORTS: Array<[name: string, load: () => Promise<unknown>]> = [
  ['react', () => import('react')],
  ['react/jsx-runtime', () => import('react/jsx-runtime')],
  ['react-dom', () => import('react-dom')],
  ['react-dom/client', () => import('react-dom/client')],
  ['three', () => import('three')],
  ['three/addons/loaders/GLTFLoader.js', () => import('three/examples/jsm/loaders/GLTFLoader.js')],
  ['three/addons/loaders/DRACOLoader.js', () => import('three/examples/jsm/loaders/DRACOLoader.js')],
  ['three/addons/loaders/KTX2Loader.js', () => import('three/examples/jsm/loaders/KTX2Loader.js')],
  ['@react-three/fiber', () => import('@react-three/fiber')],
  ['@react-three/rapier', () => import('@react-three/rapier')],
  ['@react-three/drei', () => import('@react-three/drei')],
  ['@react-three/uikit', () => import('@react-three/uikit')],
  ['@pmndrs/uikit', () => import('@pmndrs/uikit')],
  // 自分自身。アイテムの useItem / Interactable などがワールドと同じ Context を見るために必須
  ['@xrift/world-components', () => import('../../index')],
]

let cached: Promise<ShareScope> | null = null

export function buildDevShareScope(): Promise<ShareScope> {
  if (cached) return cached
  cached = (async () => {
    const scope: ShareScope = {}
    await Promise.all(
      SHARED_IMPORTS.map(async ([name, load]) => {
        try {
          const module = await load()
          scope[name] = {
            [VERSION_KEY]: { get: async () => () => module, loaded: true, scope: 'default' },
          }
        } catch {
          // 入っていない依存は共有しない（上のコメント参照）
        }
      }),
    )
    return scope
  })()
  return cached
}
