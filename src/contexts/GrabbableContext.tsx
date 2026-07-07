import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { Position3D, Rotation3D } from '../types/movement'

/**
 * 掴む対象の姿勢
 * <Grabbable> の transform prop として渡す
 */
export interface GrabbableTransform {
  /** 位置（ワールド座標） */
  position: Position3D
  /** 回転（オイラー角・ラジアン） */
  rotation: Rotation3D
  /** 均一スケール（省略時は 1） */
  scale?: number
}

/**
 * 離した（確定）ときに onMove へ返される姿勢
 */
export interface GrabResultTransform {
  position: Position3D
  rotation: Rotation3D
}

/**
 * <Grabbable> がプラットフォームに登録する情報
 * プラットフォーム側の GrabSystem はこれを使って
 * 掴んでいる間のゴースト描画・初期姿勢の取得・確定を行う
 */
export interface GrabbableEntry {
  /** 掴んでいる間に表示するゴースト（半透明・物理なし）をローカル座標で返す */
  renderGhost: () => ReactNode
  /** 離した（確定）ときに新しい姿勢を受け取る。ワールド側が適用する */
  onMove: (transform: GrabResultTransform) => void
  /** 対象の現在姿勢を返す（最新値。掴み始めに参照される） */
  getTransform: () => Required<GrabbableTransform>
}

/**
 * 掴める対象の登録・掴み状態を管理するためのインターフェース
 * プラットフォーム側（xrift-frontend）が実装を注入する
 */
export interface GrabbableContextValue {
  /** 掴める対象を登録する */
  registerGrabbable: (id: string, entry: GrabbableEntry) => void
  /** 掴める対象の登録を解除する */
  unregisterGrabbable: (id: string) => void
  /** 現在掴まれている grabbable ID を返す（なければ null） */
  getGrabbedId: () => string | null
  /** 掴まれている ID の変化を購読する（useSyncExternalStore 互換） */
  subscribeGrabbedId: (listener: () => void) => () => void
}

/**
 * デフォルト実装: 登録は受け付けるが掴む機能は動作しない
 * （掴む土台はプラットフォーム側 / DevEnvironment が提供する）
 */
export const createDefaultGrabbableImplementation = (): GrabbableContextValue => {
  const registry = new Map<string, GrabbableEntry>()

  return {
    registerGrabbable: (id, entry) => {
      registry.set(id, entry)
    },
    unregisterGrabbable: (id) => {
      registry.delete(id)
    },
    getGrabbedId: () => null,
    subscribeGrabbedId: () => () => {},
  }
}

/**
 * 掴める対象を管理するContext
 * <Grabbable> で宣言された対象をプラットフォーム側の GrabSystem が取得できる
 */
export const GrabbableContext = createContext<GrabbableContextValue>(
  createDefaultGrabbableImplementation(),
)

interface Props {
  /**
   * プラットフォーム側が提供する実装
   * 未指定の場合はデフォルト実装（登録のみ・掴めない）が使用される
   */
  implementation?: GrabbableContextValue
  children: ReactNode
}

/**
 * 掴める対象を提供するContextProvider
 * プラットフォーム側（xrift-frontend）が掴める対象を取得するために使用
 */
export const GrabbableProvider = ({ implementation, children }: Props) => {
  const value = useMemo(
    () => implementation ?? createDefaultGrabbableImplementation(),
    [implementation],
  )

  return <GrabbableContext.Provider value={value}>{children}</GrabbableContext.Provider>
}

/**
 * 掴める対象の登録・掴み状態を取得するhook
 * 主に <Grabbable> コンポーネント内部で使用する
 */
export const useGrabbableContext = (): GrabbableContextValue => useContext(GrabbableContext)
