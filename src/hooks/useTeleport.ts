import { useCallback } from 'react'
import { type TeleportDestination, useTeleportContext } from '../contexts/TeleportContext'

/**
 * テレポート機能を使用するhook
 * ワールド作成者がプレイヤーを瞬間移動させるために使用
 *
 * @example
 * const { teleport } = useTeleport()
 *
 * // 位置と向きを指定してテレポート
 * teleport({ position: [50, 0, 30], yaw: 180 })
 *
 * // 向きは省略可能（現在の向きを維持）
 * teleport({ position: [50, 0, 30] })
 *
 * @returns {{ teleport: (destination: TeleportDestination) => void }}
 */
export const useTeleport = (): { teleport: (destination: TeleportDestination) => void } => {
  const { teleport } = useTeleportContext()

  const stableTeleport = useCallback(
    (destination: TeleportDestination) => {
      teleport(destination)
    },
    [teleport],
  )

  return { teleport: stableTeleport }
}
