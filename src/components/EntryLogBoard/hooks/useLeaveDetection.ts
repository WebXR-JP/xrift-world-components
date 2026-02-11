import { useCallback, useEffect, useRef } from 'react'

import type { KnownUser, LogEntry } from '../types'
import { buildLeaveEntry, getLeaderUserId } from '../utils'

interface Params {
  allUsers: Array<{ id: string }>
  knownUsers: KnownUser[]
  localUser: { id: string } | null
  leaderReady: boolean
  leaveGraceMs: number
  hasHydratedRef: React.MutableRefObject<boolean>
  formatTimestampRef: React.MutableRefObject<() => string>
  appendLogs: (entries: LogEntry[]) => void
  setKnownUsers: (updater: (prev: KnownUser[]) => KnownUser[]) => void
}

export const useLeaveDetection = ({
  allUsers,
  knownUsers,
  localUser,
  leaderReady,
  leaveGraceMs,
  hasHydratedRef,
  formatTimestampRef,
  appendLogs,
  setKnownUsers,
}: Params) => {
  const isLeaderRef = useRef(false)
  const currentUserIdsRef = useRef<Set<string>>(new Set())
  const leaveTimersRef = useRef<Map<string, number>>(new Map())

  const clearLeaveTimers = useCallback(() => {
    for (const timerId of leaveTimersRef.current.values()) {
      clearTimeout(timerId)
    }
    leaveTimersRef.current.clear()
  }, [])

  useEffect(() => {
    if (!localUser) return
    if (allUsers.length === 0) return

    const leaderUserId = getLeaderUserId(allUsers)
    const isLeader = leaderUserId === localUser.id
    isLeaderRef.current = isLeader
    if (!isLeader) return

    const canWrite = hasHydratedRef.current || (leaderReady && allUsers.length === 1)
    if (!canWrite) return

    const currentUserIds = new Set(allUsers.map((u) => u.id))
    currentUserIdsRef.current = currentUserIds

    // 現在いるユーザーは leave タイマーを解除
    for (const userId of currentUserIds) {
      const timerId = leaveTimersRef.current.get(userId)
      if (timerId !== undefined) {
        clearTimeout(timerId)
        leaveTimersRef.current.delete(userId)
      }
    }

    // いないユーザーは猶予付きで LEAVE を確定
    for (const known of knownUsers) {
      if (currentUserIds.has(known.userId)) continue
      if (leaveTimersRef.current.has(known.userId)) continue

      const timerId = window.setTimeout(() => {
        if (!isLeaderRef.current) return
        if (currentUserIdsRef.current.has(known.userId)) return

        const leftAt = formatTimestampRef.current()

        setKnownUsers((prev) => {
          const stillThere = prev.some((u) => u.userId === known.userId)
          if (!stillThere) return prev

          appendLogs([buildLeaveEntry(known, leftAt)])
          return prev.filter((u) => u.userId !== known.userId)
        })

        leaveTimersRef.current.delete(known.userId)
      }, leaveGraceMs)

      leaveTimersRef.current.set(known.userId, timerId)
    }
  }, [
    allUsers,
    appendLogs,
    hasHydratedRef,
    formatTimestampRef,
    knownUsers,
    leaderReady,
    leaveGraceMs,
    localUser,
    setKnownUsers,
  ])

  // アンマウント時にタイマーをクリア
  useEffect(() => clearLeaveTimers, [clearLeaveTimers])

  return { clearLeaveTimers }
}
