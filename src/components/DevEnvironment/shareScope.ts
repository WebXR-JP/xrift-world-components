/**
 * Module Federation の共有スコープ（ローカル開発用）
 *
 * アイテムのバンドルは react / three / fiber などをホストから受け取る前提でビルドされている。
 * xrift-frontend が本番で渡す表と同じ形・同じ版キーを、このワールドプロジェクトに
 * インストールされている実体で組む（版キーは FEDERATION_SHARED_VERSIONS が正本）。
 *
 * 表にあるのは、このパッケージが依存しているもの（＝ワールド側に必ず入っているもの）だけ
 */

import {
  FEDERATION_SHARED_VERSIONS,
  type FederationSharedName,
} from '../../federationShared'

type SharedModuleEntry = {
  get: () => Promise<() => unknown>
  loaded: boolean
  scope: string
}

export type ShareScope = Record<string, Record<string, SharedModuleEntry>>

/**
 * 共有する名前と、それを読む方法。版キーは FEDERATION_SHARED_VERSIONS（正本）から引く
 *
 * 表にあるのは、このパッケージ自身が静的に import しているもの（＝ワールド側に必ず入っている）と
 * three の一部だけ。入っていないパッケージを文字列で import() すると、実行時ではなく Vite の
 * 依存最適化の時点で開発サーバーが起動しなくなるので、そういうものはこの表に入れない
 * （react-dom はそれで外した。アイテムが react-dom を直接使うことはまず無い）
 */
const SHARED_IMPORTS: Array<[name: FederationSharedName, load: () => Promise<unknown>]> = [
  ['react', () => import('react')],
  ['react/jsx-runtime', () => import('react/jsx-runtime')],
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
            [FEDERATION_SHARED_VERSIONS[name]]: {
              get: async () => () => module,
              loaded: true,
              scope: 'default',
            },
          }
        } catch {
          // 読めなかった依存は共有しない（アイテムがそれを使っていれば本番と同じく読み込みに失敗する）
        }
      }),
    )
    return scope
  })()
  return cached
}
