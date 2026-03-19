import { createContext, type ReactNode, useContext } from 'react'

export interface VoiceVolumeOverrideContextValue {
  setOverride: (userId: string, volume: number) => void
  clearOverride: (userId: string) => void
  clearAll: () => void
  getOverrides: () => ReadonlyMap<string, number>
}

/** @deprecated Use VoiceVolumeOverrideContextValue instead */
export type AudioVolumeContextValue = VoiceVolumeOverrideContextValue

/**
 * 開発環境用のデフォルト実装（no-op）
 * プラットフォーム側が実装を注入しない場合に使用される
 */
export const createDefaultVoiceVolumeOverrideImplementation = (): VoiceVolumeOverrideContextValue => ({
  setOverride: () => {},
  clearOverride: () => {},
  clearAll: () => {},
  getOverrides: () => new Map(),
})

/** @deprecated Use createDefaultVoiceVolumeOverrideImplementation instead */
export const createDefaultAudioVolumeImplementation = createDefaultVoiceVolumeOverrideImplementation

/**
 * 音量オーバーライド機能を提供する Context
 * xrift-frontend 側で実装を注入し、ワールド側で利用できる
 */
export const VoiceVolumeOverrideContext = createContext<VoiceVolumeOverrideContextValue | null>(null)

/** @deprecated Use VoiceVolumeOverrideContext instead */
export const AudioVolumeContext = VoiceVolumeOverrideContext

interface Props {
  value: VoiceVolumeOverrideContextValue
  children: ReactNode
}

/**
 * 音量オーバーライド機能を提供する ContextProvider
 */
export const VoiceVolumeOverrideProvider = ({ value, children }: Props) => {
  return <VoiceVolumeOverrideContext.Provider value={value}>{children}</VoiceVolumeOverrideContext.Provider>
}

/** @deprecated Use VoiceVolumeOverrideProvider instead */
export const AudioVolumeProvider = VoiceVolumeOverrideProvider

/**
 * 音量オーバーライドの Context を取得する hook
 * @throws {Error} VoiceVolumeOverrideProvider の外で呼び出された場合
 */
export const useVoiceVolumeOverrideContext = (): VoiceVolumeOverrideContextValue => {
  const context = useContext(VoiceVolumeOverrideContext)
  if (!context) {
    throw new Error('useVoiceVolumeOverrideContext must be used within VoiceVolumeOverrideProvider')
  }
  return context
}

/** @deprecated Use useVoiceVolumeOverrideContext instead */
export const useAudioVolumeContext = useVoiceVolumeOverrideContext
