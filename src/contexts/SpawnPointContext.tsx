import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'

/**
 * スポーン地点の情報
 */
export interface SpawnPoint {
  /** スポーン位置 [x, y, z] */
  position: [number, number, number]
  /** スポーン時の向き（度数法 0-360） */
  yaw: number
}

/**
 * スポーン地点を管理するためのインターフェース
 * プラットフォーム側（xrift-frontend）が実装を注入する
 */
export interface SpawnPointContextValue {
  /** 現在のスポーン地点（未設定時はnull） */
  spawnPoint: SpawnPoint | null
  /** スポーン地点を設定する */
  setSpawnPoint: (point: SpawnPoint) => void
}

/**
 * デフォルト実装: Context未設定時はローカル状態として動作
 */
const createDefaultImplementation = (): SpawnPointContextValue => {
  let currentSpawnPoint: SpawnPoint | null = null

  return {
    get spawnPoint() {
      return currentSpawnPoint
    },
    setSpawnPoint: (point: SpawnPoint) => {
      currentSpawnPoint = point
    },
  }
}

/**
 * スポーン地点を管理するContext
 * ワールド作成者がSpawnPointコンポーネントで設定した値を
 * プラットフォーム側が取得できる
 */
export const SpawnPointContext = createContext<SpawnPointContextValue>(
  createDefaultImplementation()
)

interface Props {
  /**
   * プラットフォーム側が提供する実装
   * 未指定の場合はデフォルト実装（ローカルstate）が使用される
   */
  implementation?: SpawnPointContextValue
  children: ReactNode
}

/**
 * スポーン地点を提供するContextProvider
 * プラットフォーム側（xrift-frontend）がスポーン地点を取得するために使用
 *
 * @example
 * // プラットフォーム側での使用例
 * const spawnPointImpl = useSpawnPointImplementation()
 * <SpawnPointProvider implementation={spawnPointImpl}>
 *   <WorldComponent />
 * </SpawnPointProvider>
 */
export const SpawnPointProvider = ({ implementation, children }: Props) => {
  const [spawnPoint, setSpawnPointState] = useState<SpawnPoint | null>(null)

  const setSpawnPoint = useCallback((point: SpawnPoint) => {
    setSpawnPointState(point)
  }, [])

  // 外部実装が渡された場合はそれを使用、なければデフォルト実装
  const value: SpawnPointContextValue = implementation ?? {
    spawnPoint,
    setSpawnPoint,
  }

  return (
    <SpawnPointContext.Provider value={value}>
      {children}
    </SpawnPointContext.Provider>
  )
}

/**
 * スポーン地点のContextを取得するhook
 * 通常、ワールド作成者は直接このhookを使用せず、useSpawnPointを使用する
 */
export const useSpawnPointContext = (): SpawnPointContextValue => {
  return useContext(SpawnPointContext)
}
