import { type SpawnPoint, useSpawnPointContext } from '../contexts/SpawnPointContext'

/**
 * 現在設定されているスポーン地点を取得するhook
 * 主にプラットフォーム側（xrift-frontend）で使用される
 *
 * @example
 * // プラットフォーム側での使用例
 * const spawnPoint = useSpawnPoint()
 * if (spawnPoint) {
 *   player.position.set(...spawnPoint.position)
 *   player.rotation.y = THREE.MathUtils.degToRad(spawnPoint.yaw)
 * }
 *
 * @returns スポーン地点情報（未設定時はnull）
 */
export const useSpawnPoint = (): SpawnPoint | null => {
  const { spawnPoint } = useSpawnPointContext()
  return spawnPoint
}
