import { useFrame } from '@react-three/fiber'
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import {
  type SeatControlInput,
  type VehicleEntry,
  useSeatContext,
} from '../../contexts/SeatContext'
import { VehicleSlotContext, type VehicleSlotValue } from './context'
import type { Props } from './types'

export type { Props as VehicleProps } from './types'

/**
 * 乗り物。中に `<Seat driver>` を置くと運転できるようになる。
 *
 * **姿勢を所有するのは `<Vehicle>`**。作者は `onDrive` で「どう動かしたいか」だけ書けばよく、
 * 同期は意識しなくてよい。
 *
 * - 運転者のクライアント: `onDrive` の結果で動き、その姿勢が同期に流れる
 * - それ以外のクライアント: `onDrive` は呼ばれず、届いた姿勢がそのまま当たる
 *
 * 乗り物ごと動くので、**空いている同乗席も正しい位置**に来る。流れる姿勢も 1 台につき 1 本。
 */
export const Vehicle: FC<Props> = ({ id, onDrive, children, ...groupProps }) => {
  const { registerVehicle, unregisterVehicle, getRemoteVehiclePose } = useSeatContext()
  const groupRef = useRef<Group>(null)

  // ハンドラを毎レンダー作り直しても登録し直しにならないよう ref 経由で読む
  const onDriveRef = useRef(onDrive)
  onDriveRef.current = onDrive

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const entry: VehicleEntry = {
      getPose: () => {
        group.updateWorldMatrix(true, false)
        const { position, quaternion } = group
        return {
          position: { x: position.x, y: position.y, z: position.z },
          quaternion: {
            x: quaternion.x,
            y: quaternion.y,
            z: quaternion.z,
            w: quaternion.w,
          },
        }
      },
      applyPose: (pose) => {
        group.position.set(pose.position.x, pose.position.y, pose.position.z)
        group.quaternion.set(
          pose.quaternion.x,
          pose.quaternion.y,
          pose.quaternion.z,
          pose.quaternion.w,
        )
      },
    }
    registerVehicle(id, entry)
    return () => unregisterVehicle(id, entry)
  }, [id, registerVehicle, unregisterVehicle])

  // 運転席が受け取った操縦入力を onDrive へ流す。運転者のクライアントでしか呼ばれない
  const handleControlInput = useCallback((input: SeatControlInput, delta: number) => {
    const group = groupRef.current
    if (group) onDriveRef.current?.(input, delta, group)
  }, [])

  const slot = useMemo<VehicleSlotValue>(
    () => ({ vehicleId: id, handleControlInput }),
    [id, handleControlInput],
  )

  // 自分が運転していない間は、同期されてきた姿勢を当て続ける。
  // 誰も運転していなければ null が返り、その場の姿勢のまま止まる
  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const pose = getRemoteVehiclePose(id)
    if (!pose) return
    group.position.set(pose.position.x, pose.position.y, pose.position.z)
    group.quaternion.set(
      pose.quaternion.x,
      pose.quaternion.y,
      pose.quaternion.z,
      pose.quaternion.w,
    )
  })

  return (
    <group ref={groupRef} {...groupProps}>
      <VehicleSlotContext.Provider value={slot}>{children}</VehicleSlotContext.Provider>
    </group>
  )
}
