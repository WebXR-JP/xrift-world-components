import { createContext, type ReactNode, useContext, useMemo } from 'react'
import type { Position3D } from '../types/movement'

/** クォータニオン（three と名前が衝突するので Position3D/Rotation3D に揃えた名前にする） */
export interface Quaternion3D {
  x: number
  y: number
  z: number
  w: number
}

/**
 * 座面のワールド姿勢。position は腰を置く点（<Seat> の原点）
 * 前方は -Z・上は +Y。傾く座席（乗り物・回転台）は任意の姿勢を返してよい
 */
export interface SeatSurface {
  position: Position3D
  quaternion: Quaternion3D
}

/**
 * <Seat> がプラットフォームに登録する情報
 * 着席中はプラットフォーム側が毎フレーム getSeatSurface() を読んでプレイヤーを追従させる。
 * 椅子（静止）でも乗り物（移動）でも同じインターフェースで扱う。
 * 運転席用の入力委譲（controllable / onControlInput）は乗り物フェーズで optional に追加する
 */
export interface SeatEntry {
  /** 座面のワールド姿勢を返す（着席中は毎フレーム呼ばれる） */
  getSeatSurface: () => SeatSurface
  /** 降車時にプレイヤーの足元を置くワールド位置を返す */
  getExitPosition: () => Position3D
}

/**
 * 座席の登録・着席状態を管理するためのインターフェース
 * プラットフォーム側（xrift-frontend）が実装を注入する
 */
export interface SeatContextValue {
  /** 座席を登録する */
  registerSeat: (id: string, entry: SeatEntry) => void
  /**
   * 座席の登録を解除する。entry が現在の登録と一致するときだけ削除すること
   * （StrictMode や remount で新旧の <Seat> が入れ違うと、生きている登録を消してしまう）
   */
  unregisterSeat: (id: string, entry: SeatEntry) => void
  /** ローカルプレイヤーをその座席に座らせる（<Seat> のクリックから呼ばれる） */
  sit: (seatId: string) => void
  /**
   * その座席に座っているプレイヤーの ID（自分を含む。誰も座っていなければ null）
   *
   * ワールド内の <Seat> ごとに、占有の変化のたびに呼ばれる。実装側は
   * 「座席ID → 占有者」の対応表を位置更新ごとに1回だけ作り直し、ここでは引くだけにすること
   * （毎回すべてのプレイヤーを走査すると 座席数 × 人数 の計算量になる）
   */
  getOccupantId: (seatId: string) => string | null
  /** 占有状態の変化を購読する（useSyncExternalStore 互換） */
  subscribeOccupancy: (listener: () => void) => () => void
}

/**
 * デフォルト実装: 登録は受け付けるが座る機能は動作しない
 * （着席にはアバター・カメラ・物理が必要なのでプラットフォーム側が提供する）
 */
export const createDefaultSeatImplementation = (): SeatContextValue => {
  const registry = new Map<string, SeatEntry>()
  return {
    registerSeat: (id, entry) => {
      registry.set(id, entry)
    },
    unregisterSeat: (id, entry) => {
      if (registry.get(id) === entry) registry.delete(id)
    },
    sit: () => {},
    getOccupantId: () => null,
    subscribeOccupancy: () => () => {},
  }
}

export const SeatContext = createContext<SeatContextValue>(createDefaultSeatImplementation())

interface Props {
  /**
   * プラットフォーム側が提供する実装
   * 未指定の場合はデフォルト実装（登録のみ・座れない）が使用される
   */
  implementation?: SeatContextValue
  children: ReactNode
}

/**
 * 座席を提供する ContextProvider
 * プラットフォーム側（xrift-frontend）が <Seat> の登録を受け取るために使用
 */
export const SeatProvider = ({ implementation, children }: Props) => {
  const value = useMemo(() => implementation ?? createDefaultSeatImplementation(), [implementation])
  return <SeatContext.Provider value={value}>{children}</SeatContext.Provider>
}

/** 座席の登録・着席状態を取得する hook。主に <Seat> 内部で使用する */
export const useSeatContext = (): SeatContextValue => useContext(SeatContext)
