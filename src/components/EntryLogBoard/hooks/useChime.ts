import { useEffect, useRef } from 'react'

import type { LogEntry } from '../types'

interface Params {
  logs: LogEntry[]
  localUserId: string | undefined
  chimeUrl: string
}

export const useChime = ({ logs, localUserId, chimeUrl }: Params) => {
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null)
  const chimeDisabledRef = useRef(false)
  const prevLogsLenRef = useRef<number | null>(null)
  const chimeArmedRef = useRef(false)

  useEffect(() => {
    chimeDisabledRef.current = false

    const audio = new Audio(chimeUrl)
    audio.preload = 'auto'
    audio.volume = 0.5

    const onError = () => {
      chimeDisabledRef.current = true
    }

    audio.addEventListener('error', onError)
    chimeAudioRef.current = audio

    return () => {
      audio.removeEventListener('error', onError)
      if (chimeAudioRef.current === audio) {
        chimeAudioRef.current = null
      }
    }
  }, [chimeUrl])

  useEffect(() => {
    if (!chimeArmedRef.current) {
      prevLogsLenRef.current = logs.length
      chimeArmedRef.current = true
      return
    }

    const prevLen = prevLogsLenRef.current ?? 0
    if (logs.length <= prevLen) {
      prevLogsLenRef.current = logs.length
      return
    }

    const delta = logs.slice(prevLen)
    prevLogsLenRef.current = logs.length

    const hasJoinOther = delta.some((e) => e.type === 'join' && e.userId !== localUserId)
    if (!hasJoinOther) return
    if (chimeDisabledRef.current) return

    const audio = chimeAudioRef.current
    if (!audio) return

    try {
      audio.currentTime = 0
      void audio.play().catch(() => {
        // 自動再生制限などは無視
      })
    } catch {
      // 予期しない例外も無視（UI/ログ機能を壊さない）
    }
  }, [logs, localUserId])
}
