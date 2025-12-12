import { createContext, type ReactNode, useContext } from 'react'

export interface ScreenShareContextValue {
  /** 表示する映像のvideo要素 */
  videoElement: HTMLVideoElement | null
  /** 自分が共有中か */
  isSharing: boolean
  /** 共有開始 */
  startScreenShare: () => void
  /** 共有停止 */
  stopScreenShare: () => void
}

/**
 * 画面共有の状態を提供するContext
 * xrift-frontend側で値を注入し、ワールド側で参照できる
 */
export const ScreenShareContext = createContext<ScreenShareContextValue | null>(null)

interface Props {
  value: ScreenShareContextValue
  children: ReactNode
}

/**
 * 画面共有の状態を提供するContextProvider
 */
export const ScreenShareProvider = ({ value, children }: Props) => {
  return <ScreenShareContext.Provider value={value}>{children}</ScreenShareContext.Provider>
}

/**
 * 画面共有の状態を取得するhook
 * @throws {Error} ScreenShareProvider の外で呼び出された場合
 */
export const useScreenShareContext = (): ScreenShareContextValue => {
  const context = useContext(ScreenShareContext)
  if (!context) {
    throw new Error('useScreenShareContext must be used within ScreenShareProvider')
  }
  return context
}
