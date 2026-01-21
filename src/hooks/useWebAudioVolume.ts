import { useEffect, useRef } from 'react'

interface AudioConnection {
  audioContext: AudioContext
  gainNode: GainNode
  source: MediaElementAudioSourceNode
}

// グローバルなWeakMapで各MediaElementの接続を追跡
// 一度createMediaElementSourceで接続したMediaElementは他のAudioContextに再接続できないため
const audioConnections = new WeakMap<HTMLMediaElement, AudioConnection>()

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
  const gainNodeRef = useRef<GainNode | null>(null)

  // AudioContext のセットアップと接続
  useEffect(() => {
    if (!mediaElement) {
      gainNodeRef.current = null
      return
    }

    // 既存の接続があれば再利用
    const existingConnection = audioConnections.get(mediaElement)
    if (existingConnection) {
      gainNodeRef.current = existingConnection.gainNode
      // suspended状態なら resume
      if (existingConnection.audioContext.state === 'suspended') {
        existingConnection.audioContext.resume().catch(() => {
          // resume 失敗は無視
        })
      }
      return
    }

    const setupAudioContext = () => {
      // 既に接続済みかもう一度確認
      if (audioConnections.has(mediaElement)) {
        const connection = audioConnections.get(mediaElement)!
        gainNodeRef.current = connection.gainNode
        return
      }

      try {
        // Web Audio API を使用（iOS対応）
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        const audioContext = new AudioContextClass()

        // GainNode で音量制御
        const gainNode = audioContext.createGain()
        gainNode.gain.value = volume
        gainNodeRef.current = gainNode

        // MediaElement をソースとして接続
        const source = audioContext.createMediaElementSource(mediaElement)

        // 接続: source -> gain -> destination
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // 接続情報をWeakMapに保存
        audioConnections.set(mediaElement, {
          audioContext,
          gainNode,
          source,
        })

        // AudioContext が suspended の場合は resume
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {
            // resume 失敗は無視
          })
        }
      } catch (error) {
        // 既に接続済みの場合のエラーは無視
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          // 既存の接続を探す（念のため）
          const connection = audioConnections.get(mediaElement)
          if (connection) {
            gainNodeRef.current = connection.gainNode
          }
          return
        }
        console.error('Failed to setup Web Audio API:', error)
      }
    }

    // ユーザーインタラクション後に AudioContext を開始する必要がある場合がある
    const handleInteraction = () => {
      const connection = audioConnections.get(mediaElement)
      if (!connection) {
        setupAudioContext()
      } else if (connection.audioContext.state === 'suspended') {
        connection.audioContext.resume().catch(() => {
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
      // 注意: AudioContextはクローズしない（MediaElementが再利用される可能性があるため）
      // WeakMapを使用しているので、MediaElementがGCされれば自動的にクリーンアップされる
    }
  }, [mediaElement, volume])

  // 音量変更時の処理
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume))
    }
  }, [volume])
}
