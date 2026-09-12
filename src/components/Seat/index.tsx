import { type FC, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { Group } from 'three'
import { type SeatControlInput, type SeatEntry, useSeatContext } from '../../contexts/SeatContext'
import { Interactable } from '../Interactable'
import { useVehicleSlot } from '../Vehicle/context'
import { DEFAULT_INTERACTION_TEXT } from './constants'
import type { Props } from './types'
import { computeExitPosition, decomposeSeatSurface, diffSeatOccupancy } from './utils'

export type { Props as SeatProps, SeatExitOffset } from './types'

/**
 * 座席。子要素を狙ってインタラクトすると、ローカルプレイヤーがこの座席に座る。
 *
 * group として置く: 原点が座面（腰を置く点）、前方が -Z。
 * 座面の姿勢は props ではなく**置かれた場所のワールド行列**から毎フレーム取るので、
 * 親の group・乗り物・回転台の下に置いても、動いても傾いても、そのまま追従する。
 *
 * `onControlInput` を渡すとその座席は運転席になり、自分が座っている間だけ
 * 操縦入力が毎フレーム届く。
 *
 * 座る・追従・降車・同期はプラットフォーム側（SeatContext の実装）が担う。
 * 未注入（DevEnvironment 等）では登録だけ行い、クリックしても何も起きない
 */
export const Seat: FC<Props> = ({
  id,
  exitOffset,
  driver = false,
  onEnter,
  onLeave,
  onControlInput,
  interactionText = DEFAULT_INTERACTION_TEXT,
  enabled = true,
  children,
  ...groupProps
}) => {
  const { registerSeat, unregisterSeat, sit, getOccupantId, subscribeOccupancy, getLocalUserId } =
    useSeatContext()
  const groupRef = useRef<Group>(null)
  const driverRef = useRef(driver)
  driverRef.current = driver

  // 登録エントリは props の最新値を ref 経由で読む。
  // props が変わるたびに登録し直すと、着席中に登録が入れ替わって座席が消えたと誤認される
  const exitOffsetRef = useRef(exitOffset)
  exitOffsetRef.current = exitOffset
  const onControlInputRef = useRef(onControlInput)
  onControlInputRef.current = onControlInput
  // <Vehicle> の中なら、運転席の入力は乗り物側の onDrive へ流す
  const vehicleSlot = useVehicleSlot()
  const vehicleSlotRef = useRef(vehicleSlot)
  vehicleSlotRef.current = vehicleSlot
  const drivesVehicleId = driver ? vehicleSlot?.vehicleId : undefined
  const onEnterRef = useRef(onEnter)
  onEnterRef.current = onEnter
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const getSeatSurface = () => {
      group.updateWorldMatrix(true, false)
      return decomposeSeatSurface(group.matrixWorld)
    }
    // ref 経由で呼ぶので、ハンドラを毎レンダー作り直しても登録し直しにならない。
    // 運転席なら乗り物へ、そうでなければ作者の onControlInput へ流す
    const callControlInput = (input: SeatControlInput, delta: number) => {
      if (driverRef.current) vehicleSlotRef.current?.handleControlInput(input, delta)
      onControlInputRef.current?.(input, delta)
    }

    const entry: SeatEntry = {
      getSeatSurface,
      getExitPosition: () => computeExitPosition(getSeatSurface(), exitOffsetRef.current),
      // **prop が無いときは undefined を返す**。プラットフォームはこれの有無で
      // 「運転席かどうか」を判別する（VR・モバイルで運転操作 UI を出し分けるのに要る）。
      // getter にしているのは、prop の有無が変わっても登録し直さずに済ませるため
      // （着席中に登録が入れ替わると「座席が消えた」と誤認される）
      get onControlInput() {
        // 運転席なら作者の onControlInput が無くても入力が要る（乗り物へ流すため）
        return driverRef.current || onControlInputRef.current ? callControlInput : undefined
      },
      drivesVehicleId,
    }
    registerSeat(id, entry)
    return () => unregisterSeat(id, entry)
    // drivesVehicleId はエントリに焼き込む値なので、変わったら登録し直す
  }, [id, drivesVehicleId, registerSeat, unregisterSeat])

  // 他人（または自分）が座っている間はプロンプトを出さない
  // 第3引数はSSR時のスナップショット。未着席（null）が安全側
  const occupantId = useSyncExternalStore(
    subscribeOccupancy,
    () => getOccupantId(id),
    () => null,
  )

  // 出入りを通知する。描画中に呼ぶと「レンダー中の副作用」になるので effect で出す。
  // 直前の占有者を覚えておき、変化したぶんだけ leave → enter の順で呼ぶ
  // （席を譲ったときに「降りた」より先に「座った」が来ないようにする）
  const previousOccupantRef = useRef<string | null>(null)
  useEffect(() => {
    const { leave, enter } = diffSeatOccupancy(
      previousOccupantRef.current,
      occupantId,
      getLocalUserId(),
    )
    previousOccupantRef.current = occupantId
    if (leave) onLeaveRef.current?.(leave)
    if (enter) onEnterRef.current?.(enter)
  }, [occupantId, getLocalUserId])

  const handleInteract = useCallback(() => sit(id), [sit, id])

  return (
    <group ref={groupRef} {...groupProps}>
      <Interactable
        id={id}
        onInteract={handleInteract}
        interactionText={interactionText}
        enabled={enabled && occupantId === null}
      >
        {children}
      </Interactable>
    </group>
  )
}
