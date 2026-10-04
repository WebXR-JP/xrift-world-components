/**
 * Module Federation の共有依存の「札」（パッケージ名 → 版キー）。**ここが正本**
 *
 * ワールド・アイテムのバンドルは react / three などをホストから借りる。借りるときに照らし
 * 合わせるのはこの札で、実際にインストールされている中身のバージョンではない。
 *
 * - 本番（xrift-frontend）の共有スコープも、ローカル開発（DevEnvironment）の共有スコープも、
 *   この表から札を引く。2箇所に書くとどちらかを直し忘れて「本番では読めるのに手元で読めない」になる
 * - **札は実際のバージョンに揃えない。原則、動かさない。** 公開済みのワールド・アイテムは
 *   `requiredVersion`（`^19.0.0` や `*`）でこの札を照合しており、揃えようとして変えると
 *   条件を外れ、配信されていない同梱の fallback チャンクを取りに行って 404 で全滅する
 *   （xrift-frontend #1581 → #1582 でリバート）。フロントが three を上げても札は `0.176.0` のまま
 * - 表に足すのは「新しく貸し出すパッケージ」が増えたときだけ。実物を用意するのはホスト側なので、
 *   その作業とセットでここを更新する
 * - three/addons は `requiredVersion` を持たないので版キーは `0.0.0`
 */
export const FEDERATION_SHARED_VERSIONS = {
  react: '19.1.1',
  'react-dom': '19.1.1',
  'react/jsx-runtime': '19.1.1',
  three: '0.176.0',
  'three/addons/loaders/GLTFLoader.js': '0.0.0',
  'three/addons/loaders/DRACOLoader.js': '0.0.0',
  'three/addons/loaders/KTX2Loader.js': '0.0.0',
  '@react-three/fiber': '9.3.0',
  '@react-three/rapier': '2.1.0',
  '@react-three/drei': '10.7.3',
  '@react-three/uikit': '1.0.64',
  '@pmndrs/uikit': '1.0.64',
  '@xrift/world-components': '0.1.0',
} as const satisfies Record<string, string>

export type FederationSharedName = keyof typeof FEDERATION_SHARED_VERSIONS
