import { type VoiceVolumeOverrideContextValue, useVoiceVolumeOverrideContext } from '../contexts/AudioVolumeContext'

/**
 * 特定ユーザーのボイスチャット音量をオーバーライドするhook
 * ワールド制作者が演壇やステージなどで特定ユーザーの音量を制御するために使用
 *
 * @example
 * const { setOverride, clearOverride } = useVoiceVolumeOverride()
 *
 * // 演壇に立った人の声を全体に届ける
 * setOverride(speakerUserId, 1.0)
 *
 * // オーバーライドを解除
 * clearOverride(speakerUserId)
 */
export const useVoiceVolumeOverride = (): VoiceVolumeOverrideContextValue => {
  return useVoiceVolumeOverrideContext()
}

/** @deprecated Use useVoiceVolumeOverride instead */
export const useAudioVolume = useVoiceVolumeOverride
