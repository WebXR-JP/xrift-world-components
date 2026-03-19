import { type AudioVolumeContextValue, useAudioVolumeContext } from '../contexts/AudioVolumeContext'

/**
 * 特定ユーザーの音声ボリュームをオーバーライドするhook
 * ワールド制作者が演壇やステージなどで特定ユーザーの音量を制御するために使用
 *
 * @example
 * const { setOverride, clearOverride } = useAudioVolume()
 *
 * // 演壇に立った人の声を全体に届ける
 * setOverride(speakerUserId, 1.0)
 *
 * // オーバーライドを解除
 * clearOverride(speakerUserId)
 */
export const useAudioVolume = (): AudioVolumeContextValue => {
  return useAudioVolumeContext()
}
