import { type FC, useEffect } from 'react'
import { useSpawnPointContext } from '../../contexts/SpawnPointContext'

export interface SpawnPointProps {
  /** スポーン位置 [x, y, z] */
  position?: [number, number, number]
  /** スポーン時の向き（度数法 0-360） */
  yaw?: number
}

/**
 * ワールド内のリスポーン地点を指定するコンポーネント
 * ワールド作成者がこのコンポーネントを配置することで、
 * プラットフォーム側がプレイヤーのスポーン位置を取得できる
 *
 * @example
 * // ワールド側での使用例
 * <SpawnPoint position={[0, 0, 5]} yaw={180} />
 *
 * @note
 * - 視覚的な表示はありません
 * - 1つのワールドに複数のSpawnPointがある場合、最後に設定されたものが有効になります
 */
export const SpawnPoint: FC<SpawnPointProps> = ({
  position = [0, 0, 0],
  yaw = 0,
}) => {
  const { setSpawnPoint } = useSpawnPointContext()

  useEffect(() => {
    setSpawnPoint({ position, yaw })
  }, [position, yaw, setSpawnPoint])

  return null
}
