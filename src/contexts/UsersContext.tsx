import { createContext, type ReactNode, useContext } from 'react'
import type { PlayerMovement } from '../types/movement'

/**
 * ユーザー情報の型定義
 */
export interface User {
  /** ユーザーID */
  id: string
  /** 表示名 */
  displayName: string
  /** アバターアイコンURL */
  avatarUrl: string | null
  /** ゲストかどうか */
  isGuest: boolean
}

/**
 * デフォルトの PlayerMovement（位置情報が取得できない場合に使用）
 */
const DEFAULT_PLAYER_MOVEMENT: PlayerMovement = {
  position: { x: 0, y: 0, z: 0 },
  direction: { x: 0, z: 0 },
  horizontalSpeed: 0,
  verticalSpeed: 0,
  rotation: { yaw: 0, pitch: 0 },
  isGrounded: true,
  isJumping: false,
}

/**
 * ユーザー情報を管理するためのインターフェース
 * プラットフォーム側（xrift-frontend）が実装を注入する
 */
export interface UsersContextValue {
  /** ローカルユーザー（自分） */
  localUser: User | null
  /** リモートユーザー（他の参加者） */
  remoteUsers: User[]
  /**
   * 指定したユーザーの位置情報を取得
   * useFrame内で毎フレーム呼び出しても再レンダリングを引き起こさない
   * @param userId - ユーザーID
   * @returns PlayerMovement または undefined（ユーザーが存在しない場合）
   */
  getMovement: (userId: string) => PlayerMovement | undefined
  /**
   * ローカルユーザー（自分）の位置情報を取得
   * useFrame内で毎フレーム呼び出しても再レンダリングを引き起こさない
   * @returns PlayerMovement
   */
  getLocalMovement: () => PlayerMovement
}

/**
 * デフォルト実装: Context未設定時は空の状態として動作
 * 開発時やテスト時に使用される
 */
const createDefaultImplementation = (): UsersContextValue => ({
  localUser: null,
  remoteUsers: [],
  getMovement: () => undefined,
  getLocalMovement: () => DEFAULT_PLAYER_MOVEMENT,
})

/**
 * ユーザー情報を管理するContext
 * ワールド作成者はこのContextを通じてユーザー情報にアクセスする
 */
export const UsersContext = createContext<UsersContextValue>(
  createDefaultImplementation()
)

interface Props {
  /**
   * プラットフォーム側が提供する実装
   * 未指定の場合はデフォルト実装（空の状態）が使用される
   */
  implementation?: UsersContextValue
  children: ReactNode
}

/**
 * ユーザー情報を提供するContextProvider
 * プラットフォーム側（xrift-frontend）が実装を注入するために使用
 *
 * @example
 * // プラットフォーム側での使用例
 * <UsersProvider implementation={usersImplementation}>
 *   <WorldComponent />
 * </UsersProvider>
 */
export const UsersProvider = ({ implementation, children }: Props) => {
  const value = implementation ?? createDefaultImplementation()

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  )
}

/**
 * ユーザー情報を取得するhook
 * ワールド作成者が現在のユーザー情報（自分＋他の参加者）を取得するために使用
 *
 * @example
 * // 基本的な使い方
 * const { localUser, remoteUsers } = useUsers()
 *
 * @example
 * // 位置情報を取得（useFrame内で毎フレーム呼び出し可能）
 * const { remoteUsers, getMovement, getLocalMovement } = useUsers()
 *
 * useFrame(() => {
 *   // 自分の位置を取得
 *   const myMovement = getLocalMovement()
 *
 *   // 他のユーザーの位置を取得
 *   remoteUsers.forEach(user => {
 *     const movement = getMovement(user.id)
 *     if (movement) {
 *       console.log(`${user.displayName} is at`, movement.position)
 *     }
 *   })
 * })
 */
export const useUsers = (): UsersContextValue => {
  return useContext(UsersContext)
}
