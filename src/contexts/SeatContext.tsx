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
   * 他のクライアントはその結果を再現するため）。
   *
   * **これが undefined なら運転席ではない**（普通の椅子）。運転操作 UI の
   * 出し分けに使える。値は毎回読み直すこと（作者が prop を付け外しできる）
   */
  onControlInput?: (input: SeatControlInput, delta: number) => void
  /**
   * この席が運転する乗り物の ID（`<Vehicle>` の中の `<Seat driver>` だけ持つ）。
   * プラットフォームは「自分が座っている席 → この ID → 乗り物の姿勢」を辿って同期に流す
   */
  drivesVehicleId?: string
}

/**
 * 乗り物の姿勢（`<Vehicle>` のルートの位置と向き）。
 *
 * **親から見た姿勢（ローカル）**。ワールド姿勢ではない。
 * 作者が `onDrive` で書くのもここ（`translateZ` / `rotateY` はローカルに効く）で、
 * 親の変換は全員のクライアントで同じものが掛かるため、ローカルのまま渡せば同じ場所に再現される
 * （動く床や回転台の上に乗り物を置いても、親の動きと二重に足されない）
 */
export interface VehiclePose {
  position: Position3D
  quaternion: Quaternion3D
}

/**
 * `<Vehicle>` がプラットフォームに登録する情報。
 * 運転者のクライアントはここから姿勢を読んで同期に流す。
 *
 * 逆向き（同期されてきた姿勢を当てる）は `getRemoteVehiclePose` を
 * `<Vehicle>` が毎フレーム読む形にしてある。補間しながら寄せる必要があり、
 * 「渡された瞬間に当てる」形では書けないため
 */
export interface VehicleEntry {
  /** 乗り物の姿勢を返す（運転中は毎フレーム呼ばれる） */
  getPose: () => VehiclePose
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
  /** 乗り物を登録する（`<Vehicle>` から呼ばれる） */
  registerVehicle: (id: string, entry: VehicleEntry) => void
  /** 乗り物の登録を解除する。entry が一致するときだけ削除すること */
  unregisterVehicle: (id: string, entry: VehicleEntry) => void
  /**
   * 同期されてきた乗り物の姿勢。**自分が運転している、または誰も運転していない**なら null
   * （その場合は自分の `onDrive` の結果をそのまま使う）。
   * 乗り物を動かしているのは運転者のクライアントだけなので、他の人はこれを当てる
   */
  getRemoteVehiclePose: (vehicleId: string) => VehiclePose | null
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
    registerVehicle: () => {},
    unregisterVehicle: () => {},
    getRemoteVehiclePose: () => null,
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
