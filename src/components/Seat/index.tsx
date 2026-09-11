import { type FC, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { Group } from 'three'
import { useSeatContext } from '../../contexts/SeatContext'
import { Interactable } from '../Interactable'
import { DEFAULT_INTERACTION_TEXT } from './constants'
import type { Props } from './types'
import { computeExitPosition, decomposeSeatSurface } from './utils'

export type { Props as SeatProps, SeatExitOffset } from './types'

/**
 * 座席。子要素を狙ってインタラクトすると、ローカルプレイヤーがこの座席に座る。
 *
 * group として置く: 原点が座面（腰を置く点）、前方が -Z。
 * 座面の姿勢は props ではなく**置かれた場所のワールド行列**から毎フレーム取るので、
 * 親の group・乗り物・回転台の下に置いても、動いても傾いても、そのまま追従する。
 *
 * 座る・追従・降車・同期はプラットフォーム側（SeatContext の実装）が担う。
 * 未注入（DevEnvironment 等）では登録だけ行い、クリックしても何も起きない
 */
export const Seat: FC<Props> = ({
  id,
  exitOffset,
  interactionText = DEFAULT_INTERACTION_TEXT,
  enabled = true,
  children,
  ...groupProps
}) => {
  const { registerSeat, unregisterSeat, sit, getOccupantId, subscribeOccupancy } =
    useSeatContext()
  const groupRef = useRef<Group>(null)

  // 登録エントリは props の最新値を ref 経由で読む。
  // props が変わるたびに登録し直すと、着席中に登録が入れ替わって座席が消えたと誤認される
  const exitOffsetRef = useRef(exitOffset)
  exitOffsetRef.current = exitOffset

  useEffect(() => {
    const group = groupRef.current
    if (!group) return

    const getSeatSurface = () => {
      group.updateWorldMatrix(true, false)
      return decomposeSeatSurface(group.matrixWorld)
    }
    const entry = {
      getSeatSurface,
      getExitPosition: () => computeExitPosition(getSeatSurface(), exitOffsetRef.current),
    }
    registerSeat(id, entry)
    return () => unregisterSeat(id, entry)
  }, [id, registerSeat, unregisterSeat])

  // 他人（または自分）が座っている間はプロンプトを出さない
  // 第3引数はSSR時のスナップショット。未着席（null）が安全側
  const occupantId = useSyncExternalStore(
    subscribeOccupancy,
    () => getOccupantId(id),
    () => null,
  )

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
