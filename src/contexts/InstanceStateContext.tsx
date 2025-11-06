import { createContext, type ReactNode, useContext } from 'react'

/**
 * インスタンス状態を管理するためのインターフェース
 * プラットフォーム側（xrift-frontend）がWebSocket実装を注入する
 */
export interface InstanceStateContextValue {
  /**
   * 全ての状態を保持するMap
   * stateId -> 状態の値
   */
  states: Map<string, unknown>
  /**
   * 状態を送信する関数
   * @param stateId 状態の一意識別子
   * @param payload 送信する状態
   */
  sendState: (stateId: string, payload: unknown) => void
}

/**
 * デフォルト実装: Context未設定時はローカル状態として動作
 * 開発時やテスト時に使用される
 */
const createDefaultImplementation = (): InstanceStateContextValue => {
  const states = new Map<string, unknown>()

  return {
    states,
    sendState: (stateId: string, payload: unknown) => {
      states.set(stateId, payload)
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
