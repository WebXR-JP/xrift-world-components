import { createContext, useContext } from 'react'
import type { SeatControlInput } from '../../contexts/SeatContext'

/** `<Vehicle>` が中の `<Seat driver>` へ渡すもの（world-components 内部の配線） */
export interface VehicleSlotValue {
  vehicleId: string
  /** 運転席が受け取った操縦入力をそのまま流す。乗り物側が onDrive を呼ぶ */
  handleControlInput: (input: SeatControlInput, delta: number) => void
}

export const VehicleSlotContext = createContext<VehicleSlotValue | null>(null)

/** 自分が `<Vehicle>` の中にいるか（`<Seat driver>` が使う）。外なら null */
export const useVehicleSlot = (): VehicleSlotValue | null => useContext(VehicleSlotContext)
