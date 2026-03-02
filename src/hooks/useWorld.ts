import { useEffect, useState } from 'react'
import { type WorldInfo, useWorldContext } from '../contexts/WorldContext'

/**
 * ワールド情報の取得を提供するフック
 *
 * @example
 * const { info } = useWorld('world-id')
 *
 * // ワールド情報を表示
 * <Text>{info?.name}</Text>
 */
export const useWorld = (worldId: string) => {
  const { getWorldInfo } = useWorldContext()
  const [info, setInfo] = useState<WorldInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    getWorldInfo(worldId)
      .then((result) => {
        if (!cancelled) setInfo(result)
      })
      .catch((err) => {
        console.warn('[useWorld] Failed to fetch world info:', err)
      })
    return () => {
      cancelled = true
    }
  }, [worldId, getWorldInfo])

  return { info }
}
