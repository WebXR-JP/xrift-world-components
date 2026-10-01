/**
 * Module Federation の共有スコープ（ローカル開発用）
 *
 * アイテムのバンドルは react / three / fiber などをホストから受け取る前提でビルドされている
 * （requiredVersion は '*'。版キーは何でもよい）。xrift-frontend が本番で渡す表と同じ形を、
 * このワールドプロジェクトにインストールされている実体で組む。
 *
 * 表にあるのは、このパッケージが依存しているもの（＝ワールド側に必ず入っているもの）だけ
 */

type SharedModuleEntry = {
  get: () => Promise<() => unknown>
  loaded: boolean
  scope: string
}

export type ShareScope = Record<string, Record<string, SharedModuleEntry>>

/**
 * 版キーは本番（xrift-frontend）が渡す共有表と同じ値にする
 *
 * アイテムは `requiredVersion` でこのキーを照合する。いまのテンプレートは '*' だが、以前の
 * テンプレートで作ったアイテムは `^19.0.0` のような範囲を持っていて、'0.0.0' では満たせず
 * 同梱の fallback チャンク（配信されていない）を取りに行って 404 になる。
 * 公開済みのアイテムはこの表で動いている実績がある（frontend の DEV_SHARED_DEPENDENCIES）。
 * three/addons は requiredVersion を持たないので版キーは何でもよい
 */
const SHARED_IMPORTS: Array<[name: string, version: string, load: () => Promise<unknown>]> = [
  ['react', '19.1.1', () => import('react')],
  ['react/jsx-runtime', '19.1.1', () => import('react/jsx-runtime')],
  ['three', '0.176.0', () => import('three')],
  // three の一部なので、three が入っていれば必ず解決できる
  ['three/addons/loaders/GLTFLoader.js', '0.0.0', () => import('three/examples/jsm/loaders/GLTFLoader.js')],
  ['three/addons/loaders/DRACOLoader.js', '0.0.0', () => import('three/examples/jsm/loaders/DRACOLoader.js')],
  ['three/addons/loaders/KTX2Loader.js', '0.0.0', () => import('three/examples/jsm/loaders/KTX2Loader.js')],
  ['@react-three/fiber', '9.3.0', () => import('@react-three/fiber')],
  // ここから下はこのパッケージ自身が静的に import しているもの（ワールド側に必ず入っている）。
  // 入っていないパッケージを文字列で import() すると、実行時ではなく Vite の依存最適化の時点で
  // 開発サーバーが起動しなくなるので、そういうものはこの表に入れない（react-dom はそれで外した。
  // アイテムが react-dom を直接使うことはまず無い）
  ['@react-three/rapier', '2.1.0', () => import('@react-three/rapier')],
  ['@react-three/drei', '10.7.3', () => import('@react-three/drei')],
  ['@react-three/uikit', '1.0.64', () => import('@react-three/uikit')],
  ['@pmndrs/uikit', '1.0.64', () => import('@pmndrs/uikit')],
  // 自分自身。アイテムの useItem / Interactable などがワールドと同じ Context を見るために必須
  ['@xrift/world-components', '0.1.0', () => import('../../index')],
]

let cached: Promise<ShareScope> | null = null

export function buildDevShareScope(): Promise<ShareScope> {
  if (cached) return cached
  cached = (async () => {
    const scope: ShareScope = {}
    await Promise.all(
      SHARED_IMPORTS.map(async ([name, version, load]) => {
        try {
          const module = await load()
          scope[name] = {
            [version]: { get: async () => () => module, loaded: true, scope: 'default' },
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
