import { createContext, type ReactNode, useContext, useState } from 'react'

/**
 * インスタンス状態を管理するためのインターフェース
 * プラットフォーム側（xrift-frontend）がWebSocket実装を注入する
 */
export interface InstanceStateContextValue {
  /**
   * 指定されたIDの状態を取得する
   * @param stateId 状態の一意識別子
   * @param initialState 初期状態
   * @returns [現在の状態, 状態更新関数]
   */
  getState: <T>(
    stateId: string,
    initialState: T
  ) => [T, (state: T | ((prevState: T) => T)) => void]
}

/**
 * デフォルト実装: Context未設定時はローカルuseStateとして動作
 * 開発時やテスト時に使用される
 */
const createDefaultImplementation = (): InstanceStateContextValue => {
  const stateMap = new Map<string, any>()
  const setterMap = new Map<string, (value: any) => void>()

  return {
    getState: <T,>(stateId: string, initialState: T) => {
      // このstateIdで既に状態が存在する場合は既存の状態を返す
      if (stateMap.has(stateId)) {
        return [stateMap.get(stateId), setterMap.get(stateId)!]
      }

      // 新しい状態を作成
      const [state, setState] = useState<T>(initialState)
      stateMap.set(stateId, state)
      setterMap.set(stateId, setState)

      return [state, setState]
    },
  }
}

/**
 * インスタンス状態を管理するContext
 * ワールド作成者はこのContextを通じてインスタンス全体で同期される状態にアクセスする
 */
export const InstanceStateContext = createContext<InstanceStateContextValue>(
  createDefaultImplementation()
)

interface Props {
  /**
   * プラットフォーム側が提供する実装（WebSocket同期など）
   * 未指定の場合はデフォルト実装（ローカルstate）が使用される
   */
  implementation?: InstanceStateContextValue
  children: ReactNode
}

/**
 * インスタンス状態を提供するContextProvider
 * プラットフォーム側（xrift-frontend）がWebSocket実装を注入するために使用
 *
 * @example
 * // プラットフォーム側での使用例
 * <InstanceStateProvider implementation={webSocketImplementation}>
 *   <WorldComponent />
 * </InstanceStateProvider>
 */
export const InstanceStateProvider = ({ implementation, children }: Props) => {
  const defaultImplementation = createDefaultImplementation()
  const value = implementation || defaultImplementation

  return (
    <InstanceStateContext.Provider value={value}>
      {children}
    </InstanceStateContext.Provider>
  )
}

/**
 * インスタンス状態のContextを取得するhook
 * 通常、ワールド作成者は直接このhookを使用せず、useInstanceStateを使用する
 */
export const useInstanceStateContext = (): InstanceStateContextValue => {
  return useContext(InstanceStateContext)
}
