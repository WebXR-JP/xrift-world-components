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

/** 座席に座っているプレイヤー */
export interface SeatOccupant {
  /** プレイヤーの userId */
  id: string
  /** 自分（ローカルユーザー）かどうか */
  isLocalUser: boolean
}

/**
 * 操縦入力（運転席に座っているプレイヤーの操作意図）
 *
 * 「どれだけ動くか」ではなく「どの向きに動かしたいか」を -1〜1 で渡す。
 * 実際に乗り物をどう動かすかは乗り物側が決める。たとえば `right` は、
 * 車なら旋回（ハンドル）、ホバークラフトなら横滑りとして解釈してよい
 */
export interface SeatControlInput {
  /** 前後。前が +1、後ろが -1（キーボードなら W / S） */
  forward: number
  /** 左右。右が +1、左が -1（キーボードなら D / A） */
  right: number
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
  /**
   * 操縦入力を受け取る（運転席のみ）。
   * **ローカルプレイヤーがこの座席に座っている間だけ**毎フレーム呼ばれる。
   * 他人が座っている座席では呼ばれない（乗り物は運転者のクライアントが動かし、
   * 他のクライアントはその結果を再現するため）
   */
  onControlInput?: (input: SeatControlInput, delta: number) => void
}

/** 座席の出入りの通知。誰が座っても呼ばれる（`isLocalUser` で自分か判別する） */
export interface SeatOccupancyListener {
  onEnter?: (occupant: SeatOccupant) => void
  onLeave?: (occupant: SeatOccupant) => void
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
   * ワールド内の <Seat> ごとに、占有の変化のたびに呼ばれる。
   * 素直に全プレイヤーを走査する実装でよい（比較するだけなので実質の負荷はない）。
   * 座席が極端に多いワールドが出てきたら、そのとき対応表を持たせればよい
   */
  getOccupantId: (seatId: string) => string | null
  /** 占有状態の変化を購読する（useSyncExternalStore 互換） */
  subscribeOccupancy: (listener: () => void) => () => void
  /**
   * ローカルユーザーの ID（未確定なら null）。
   * 出入りの通知で「自分かどうか」を判別するために使う
   */
  getLocalUserId: () => string | null
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
    getLocalUserId: () => null,
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
