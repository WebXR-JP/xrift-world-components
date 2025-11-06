import { useInstanceStateContext } from '../contexts/InstanceStateContext'

/**
 * インスタンス全体で同期される状態を管理するhook
 *
 * React の useState と同じAPIを提供します。
 * Context未設定時はローカルstateとして動作し、
 * プラットフォーム側が実装を注入することでWebSocket同期などが可能になります。
 *
 * @param stateId 状態の一意識別子（インスタンス内で一意である必要があります）
 * @param initialState 初期状態
 * @returns [現在の状態, 状態更新関数]
 *
 * @example
 * // ボタンの有効/無効状態を管理
 * const [buttonState, setButtonState] = useInstanceState('button-1', { enabled: false })
 *
 * // 直接値を設定
 * setButtonState({ enabled: true })
 *
 * // 関数型アップデート
 * setButtonState(prev => ({ enabled: !prev.enabled }))
 *
 * @example
 * // より複雑な状態の管理
 * interface DoorState {
 *   isOpen: boolean
 *   openedBy: string | null
 * }
 *
 * const [doorState, setDoorState] = useInstanceState<DoorState>('main-door', {
 *   isOpen: false,
 *   openedBy: null
 * })
 *
 * // ドアを開く
 * setDoorState({ isOpen: true, openedBy: 'player-123' })
 */
export function useInstanceState<T>(
  stateId: string,
  initialState: T
): [T, (state: T | ((prevState: T) => T)) => void] {
  const context = useInstanceStateContext()
  return context.getState(stateId, initialState)
}
