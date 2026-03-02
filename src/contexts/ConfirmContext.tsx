import { createContext, type ReactNode, useContext } from 'react'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export interface ConfirmContextValue {
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>
}

/**
 * 開発環境用のデフォルト実装（window.confirm）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultConfirmImplementation = (): ConfirmContextValue => ({
  requestConfirm: (options) => Promise.resolve(window.confirm(options.message)),
})

/**
 * 確認モーダル機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const ConfirmContext = createContext<ConfirmContextValue | null>(null)

interface Props {
  value: ConfirmContextValue
  children: ReactNode
}

/**
 * 確認モーダル機能を提供する ContextProvider
 */
export const ConfirmProvider = ({ value, children }: Props) => {
  return <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>
}

/**
 * 確認モーダルの Context を取得する hook
 * @throws {Error} ConfirmProvider の外で呼び出された場合
 */
export const useConfirmContext = (): ConfirmContextValue => {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirmContext must be used within ConfirmProvider')
  }
  return context
}
