import type {
  SeatContextValue,
  SeatEntry,
  VehicleEntry,
  VehiclePose,
} from '../../../../contexts/SeatContext'
import { DEV_LOCAL_USER_ID } from '../../constants'

/**
 * DevEnvironment 用の座席ストア（React 非依存）。
 * 単独プレイヤーの開発環境なので、占有は「自分が座っている席が1つ」だけ。
 * 本番（xrift-frontend の SeatSystem）と同じ SeatContext の形で <Seat> / <Vehicle> に渡す
 */
export interface DevSeatStore {
  /** 座席の登録を解除する。entry が現在の登録と一致するときだけ削除する */
  getSeat: (id: string) => SeatEntry | undefined
  /** その座席の占有者（自分が座っていれば自分の ID、そうでなければ null） */
  getOccupantId: (seatId: string) => string | null
  /** 占有の変化を購読する（useSyncExternalStore 互換） */
  subscribeOccupancy: (listener: () => void) => () => void
  /** 着席中の座席 ID（未着席なら null）。PhysicsPlayer が毎フレーム読む */
  getSeatId: () => string | null
  /** その座席に座る */
  sit: (seatId: string) => void
  /** 立ち上がる */
  standUp: () => void
  /** <Seat> / <Vehicle> に渡す SeatContext の実装 */
  contextValue: SeatContextValue
}

export function createDevSeatStore(): DevSeatStore {
  const seatRegistry = new Map<string, SeatEntry>()
  const vehicleRegistry = new Map<string, VehicleEntry>()
  const listeners = new Set<() => void>()
  let seatId: string | null = null

  const notify = () => {
    for (const listener of listeners) listener()
  }

  const sit = (id: string) => {
    if (seatId === id) return
    seatId = id
    notify()
  }

  const standUp = () => {
    if (seatId === null) return
    seatId = null
    notify()
  }

  const contextValue: SeatContextValue = {
    registerSeat: (id, entry) => {
      seatRegistry.set(id, entry)
    },
    unregisterSeat: (id, entry) => {
      if (seatRegistry.get(id) === entry) seatRegistry.delete(id)
    },
    sit,
    getOccupantId: (id) => (seatId === id ? DEV_LOCAL_USER_ID : null),
    subscribeOccupancy: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getLocalUserId: () => DEV_LOCAL_USER_ID,
    registerVehicle: (id, entry) => {
      vehicleRegistry.set(id, entry)
    },
    unregisterVehicle: (id, entry) => {
      if (vehicleRegistry.get(id) === entry) vehicleRegistry.delete(id)
    },
    // 単独プレイヤーなので他人が運転してくることはない。
    // 自分が運転している乗り物は自分の onDrive の結果をそのまま使うため常に null
    getRemoteVehiclePose: (_vehicleId: string): VehiclePose | null => null,
  }

  return {
    getSeat: (id) => seatRegistry.get(id),
    getOccupantId: (id) => (seatId === id ? DEV_LOCAL_USER_ID : null),
    subscribeOccupancy: contextValue.subscribeOccupancy,
    getSeatId: () => seatId,
    sit,
    standUp,
    contextValue,
  }
}
