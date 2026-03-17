import { createContext, type ReactNode, useContext } from 'react'

export interface AudioVolumeContextValue {
  setOverride: (userId: string, volume: number) => void
  clearOverride: (userId: string) => void
  clearAll: () => void
  getOverrides: () => ReadonlyMap<string, number>
}

/**
 * 開発環境用のデフォルト実装（no-op）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultAudioVolumeImplementation = (): AudioVolumeContextValue => ({
  setOverride: () => {},
  clearOverride: () => {},
  clearAll: () => {},
  getOverrides: () => new Map(),
})

/**
 * 音量オーバーライド機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const AudioVolumeContext = createContext<AudioVolumeContextValue | null>(null)

interface Props {
  value: AudioVolumeContextValue
  children: ReactNode
}

/**
 * 音量オーバーライド機能を提供する ContextProvider
 */
export const AudioVolumeProvider = ({ value, children }: Props) => {
  return <AudioVolumeContext.Provider value={value}>{children}</AudioVolumeContext.Provider>
}

/**
 * 音量オーバーライドの Context を取得する hook
 * @throws {Error} AudioVolumeProvider の外で呼び出された場合
 */
export const useAudioVolumeContext = (): AudioVolumeContextValue => {
  const context = useContext(AudioVolumeContext)
  if (!context) {
    throw new Error('useAudioVolumeContext must be used within AudioVolumeProvider')
  }
  return context
}
