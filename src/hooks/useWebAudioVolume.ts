import { useEffect, useRef } from 'react'

/**
 * Web Audio API を使用して HTMLMediaElement（video/audio）の音量を制御するフック
 * iOSでは HTMLMediaElement.volume が読み取り専用のため、GainNode を使用して音量を制御する
 *
 * @param mediaElement - 音量を制御する HTMLVideoElement または HTMLAudioElement
 * @param volume - 音量（0〜1）
 */
export const useWebAudioVolume = (
  mediaElement: HTMLVideoElement | HTMLAudioElement | null,
  volume: number
) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const connectedElementRef = useRef<HTMLMediaElement | null>(null)

  // AudioContext のセットアップと接続
  useEffect(() => {
    if (!mediaElement) return

    // 同じ要素が既に接続されている場合はスキップ
    // 一度 createMediaElementSource で接続した要素は再接続できないため
    if (connectedElementRef.current === mediaElement) {
      return
    }

    // 新しい要素の場合、古い AudioContext をクリーンアップ
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // クローズ失敗は無視
      })
      audioContextRef.current = null
      gainNodeRef.current = null
      sourceRef.current = null
    }

    const setupAudioContext = () => {
      try {
        // Web Audio API を使用（iOS対応）
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        const audioContext = new AudioContextClass()
        audioContextRef.current = audioContext

        // GainNode で音量制御
        const gainNode = audioContext.createGain()
        gainNode.gain.value = volume
        gainNodeRef.current = gainNode

        // MediaElement をソースとして接続
        const source = audioContext.createMediaElementSource(mediaElement)
        sourceRef.current = source

        // 接続: source -> gain -> destination
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // 接続済みの要素を記録
        connectedElementRef.current = mediaElement

        // AudioContext が suspended の場合は resume
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {
            // resume 失敗は無視
          })
        }
      } catch (error) {
        console.error('Failed to setup Web Audio API:', error)
      }
    }

    // ユーザーインタラクション後に AudioContext を開始する必要がある場合がある
    const handleInteraction = () => {
      if (!audioContextRef.current) {
        setupAudioContext()
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {
          // resume 失敗は無視
        })
      }
    }

    // 初回セットアップを試みる
    setupAudioContext()

    // インタラクションイベントでの再試行
    document.addEventListener('click', handleInteraction)
    document.addEventListener('touchstart', handleInteraction)

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [mediaElement, volume])

  // 音量変更時の処理
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume))
    }
  }, [volume])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // クローズ失敗は無視
        })
        audioContextRef.current = null
        gainNodeRef.current = null
        sourceRef.current = null
        connectedElementRef.current = null
      }
    }
  }, [])
}
