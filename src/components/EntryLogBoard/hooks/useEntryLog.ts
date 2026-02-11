import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useUsers } from '../../../contexts/UsersContext'
import { useInstanceState } from '../../../hooks/useInstanceState'

import { DEFAULT_KNOWN_USERS, DEFAULT_LOGS } from '../constants'
import type { KnownUser, LogEntry } from '../types'
import { getLeaderUserId, mergeLogs, processJoins } from '../utils'
import { useHydration } from './useHydration'
import { useLeaveDetection } from './useLeaveDetection'

interface Params {
  stateNamespace: string
  maxEntries: number
  leaveGraceMs: number
  leaderHydrationGraceMs: number
  displayNameFallback: string
  formatTimestamp: () => string
}

export const useEntryLog = ({
  stateNamespace,
  maxEntries,
  leaveGraceMs,
  leaderHydrationGraceMs,
  displayNameFallback,
  formatTimestamp,
}: Params) => {
  const { localUser, remoteUsers } = useUsers()
  const [logs, setLogs] = useInstanceState<LogEntry[]>(`${stateNamespace}-logs`, DEFAULT_LOGS)
  const [knownUsers, setKnownUsers] = useInstanceState<KnownUser[]>(`${stateNamespace}-known-users`, DEFAULT_KNOWN_USERS)

  const formatTimestampRef = useRef(formatTimestamp)
  const maxEntriesRef = useRef(maxEntries)
  const leaderRef = useRef<string | null>(null)
  const leaderSinceMsRef = useRef<number>(0)
  const leaderReadyTimerRef = useRef<number | null>(null)

  useEffect(() => { formatTimestampRef.current = formatTimestamp }, [formatTimestamp])
  useEffect(() => { maxEntriesRef.current = maxEntries }, [maxEntries])

  const { hasHydratedRef, leaderReady, setLeaderReady } = useHydration(logs, knownUsers)

  const allUsers = useMemo(() => {
    const list = [...remoteUsers]
    if (localUser) list.unshift(localUser)
    return list
  }, [localUser, remoteUsers])

  const resolveDisplayName = useCallback(
    (user: { displayName: string }) => user.displayName || displayNameFallback,
    [displayNameFallback],
  )

  const appendLogs = useCallback((newEntries: LogEntry[]) => {
    if (newEntries.length === 0) return
    setLogs((prev) => mergeLogs(prev, newEntries, maxEntriesRef.current))
  }, [setLogs])

  const { clearLeaveTimers } = useLeaveDetection({
    allUsers,
    knownUsers,
    localUser,
    leaderReady,
    leaveGraceMs,
    hasHydratedRef,
    formatTimestampRef,
    appendLogs,
    setKnownUsers,
  })

  // --- JOIN 処理 + リーダー遷移 ---

  useEffect(() => {
    if (!localUser) return
    if (allUsers.length === 0) return

    const nowMs = Date.now()
    const leaderUserId = getLeaderUserId(allUsers)
    const isLeader = leaderUserId === localUser.id

    if (leaderRef.current !== leaderUserId) {
      leaderRef.current = leaderUserId
      leaderSinceMsRef.current = nowMs
      clearLeaveTimers()

      if (leaderReadyTimerRef.current !== null) {
        clearTimeout(leaderReadyTimerRef.current)
        leaderReadyTimerRef.current = null
      }
      setLeaderReady(false)
      if (isLeader && allUsers.length === 1 && !hasHydratedRef.current) {
        leaderReadyTimerRef.current = window.setTimeout(() => {
          setLeaderReady(true)
          leaderReadyTimerRef.current = null
        }, leaderHydrationGraceMs)
      }
    }

    if (!isLeader) return

    const canWrite = hasHydratedRef.current || (leaderReady && allUsers.length === 1)
    if (!canWrite) return

    const currentUsersById = new Map<string, { displayName: string; avatarUrl: string | null }>()
    for (const user of allUsers) {
      currentUsersById.set(user.id, {
        displayName: resolveDisplayName(user),
        avatarUrl: user.avatarUrl,
      })
    }

    setKnownUsers((prev) => {
      const { nextKnownUsers, joinEntries } = processJoins(prev, currentUsersById, formatTimestampRef.current)
      appendLogs(joinEntries)
      return nextKnownUsers
    })
  }, [
    allUsers,
    appendLogs,
    clearLeaveTimers,
    hasHydratedRef,
    leaderReady,
    leaderHydrationGraceMs,
    localUser,
    resolveDisplayName,
    setKnownUsers,
    setLeaderReady,
  ])

  // --- クリーンアップ ---

  useEffect(() => {
    return () => {
      if (leaderReadyTimerRef.current !== null) {
        clearTimeout(leaderReadyTimerRef.current)
        leaderReadyTimerRef.current = null
      }
    }
  }, [])

  return { logs }
}
