import { useFrame } from '@react-three/fiber'
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react'
import { type Group, Quaternion, Vector3 } from 'three'
import {
  type SeatControlInput,
  type VehicleEntry,
  useSeatContext,
} from '../../contexts/SeatContext'
import { VehicleSlotContext, type VehicleSlotValue } from './context'
import type { Props } from './types'
import { remotePoseLerpFactor } from './utils'

export type { Props as VehicleProps } from './types'

// 毎フレーム使う作業用。useFrame の中で同期的に使い切るので全インスタンスで共有してよい
const _remotePosition = new Vector3()
const _remoteQuaternion = new Quaternion()

/**
 * 乗り物。中に `<Seat driver>` を置くと運転できるようになる。
 *
 * **姿勢を所有するのは `<Vehicle>`**。作者は `onDrive` で「どう動かしたいか」だけ書けばよく、
 * 同期は意識しなくてよい。
 *
 * - 運転者のクライアント: `onDrive` の結果で動き、その姿勢が同期に流れる
 * - それ以外のクライアント: `onDrive` は呼ばれず、届いた姿勢へ滑らかに寄せる
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
      // 親から見た姿勢をそのまま渡す。onDrive が書くのもここ（translateZ / rotateY はローカル）で、
      // 親の変換は全員のクライアントで同じものが掛かるので、これで同じ場所に再現される
      getPose: () => {
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

  // 自分が運転していない間は、同期されてきた姿勢へ寄せ続ける。
  // 誰も運転していなければ null が返り、その場の姿勢のまま止まる
  useFrame((_state, delta) => {
    const group = groupRef.current
    if (!group) return
    const pose = getRemoteVehiclePose(id)
    if (!pose) return
    _remotePosition.set(pose.position.x, pose.position.y, pose.position.z)
    _remoteQuaternion.set(
      pose.quaternion.x,
      pose.quaternion.y,
      pose.quaternion.z,
      pose.quaternion.w,
    )
    const factor = remotePoseLerpFactor(delta, group.position.distanceTo(_remotePosition))
    group.position.lerp(_remotePosition, factor)
    group.quaternion.slerp(_remoteQuaternion, factor)
  })

  return (
    <group ref={groupRef} {...groupProps}>
      <VehicleSlotContext.Provider value={slot}>{children}</VehicleSlotContext.Provider>
    </group>
  )
}
