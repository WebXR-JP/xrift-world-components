import { createContext, type ReactNode, useContext } from 'react'

/**
 * 自分のカメラがどこにあるか
 *
 * - `first-person`: 自分の目の位置（一人称）。VR は常にこれ
 * - `third-person`: アバターの後ろから見ている（三人称）。自分の頭も描かれる
 *
 * 撮影（カメラモード）のプレビュー中は、撮影用の別カメラに一時的に切り替わっているだけなので
 * プレイヤーの視点としては `first-person` を返す（撮る瞬間だけ演出が変わって写らないのを防ぐ）
 */
export type Viewpoint = 'first-person' | 'third-person'

/**
 * 視点の Context 値
 *
 * **注入側（プラットフォーム）への契約:**
 * `viewpoint` はただの値なので、視点が変わったら**新しいオブジェクトに差し替えること**。
 * 同じオブジェクトを持ち続けると、ワールド側は再レンダーされず古い視点のままになる。
 */
export interface ViewpointContextValue {
  /** いまの視点。切り替わると再レンダーで受け取れる */
  viewpoint: Viewpoint
  /**
   * いまの視点を返す関数
   *
   * 値ではなく関数。`useFrame` の中から再レンダーなしで呼べる。
   * 切り替えたそのフレームから正しい値を返す（`viewpoint` は再レンダーを待つぶん遅れうる）
   */
  getViewpoint: () => Viewpoint
}

/**
 * デフォルト実装（プラットフォームが実装を注入しない場合に使用される）
 * 三人称を持たない環境（DevEnvironment など）なので常に一人称
 */
export const createDefaultViewpointImplementation = (): ViewpointContextValue => ({
  viewpoint: 'first-person',
  getViewpoint: () => 'first-person',
})

/**
 * 視点（一人称・三人称）を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const ViewpointContext = createContext<ViewpointContextValue | null>(null)

interface Props {
  value: ViewpointContextValue
  children: ReactNode
}

/** 視点を提供する ContextProvider */
export const ViewpointProvider = ({ value, children }: Props) => {
  return <ViewpointContext.Provider value={value}>{children}</ViewpointContext.Provider>
}

/**
 * 視点の Context を取得する hook
 * @throws {Error} ViewpointProvider の外で呼び出された場合
 */
export const useViewpointContext = (): ViewpointContextValue => {
  const context = useContext(ViewpointContext)
  if (!context) {
    throw new Error('useViewpointContext must be used within ViewpointProvider')
  }
  return context
}
