import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUsers } from '../../../contexts/UsersContext'
import { useInstanceState } from '../../../hooks/useInstanceState'

import { DEFAULT_KNOWN_USERS, DEFAULT_LOGS } from '../constants'
import type { KnownUser, LogEntry } from '../types'
import { getLeaderUserId } from '../utils'

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
  const logsStateKey = `${stateNamespace}-logs`
  const knownUsersStateKey = `${stateNamespace}-known-users`

  const { localUser, remoteUsers } = useUsers()
  const [logs, setLogs] = useInstanceState<LogEntry[]>(logsStateKey, DEFAULT_LOGS)
  const [knownUsers, setKnownUsers] = useInstanceState<KnownUser[]>(knownUsersStateKey, DEFAULT_KNOWN_USERS)
  const [leaderReady, setLeaderReady] = useState(false)

  const leaderRef = useRef<string | null>(null)
  const leaderSinceMsRef = useRef<number>(0)
  const isLeaderRef = useRef(false)
  const currentUserIdsRef = useRef<Set<string>>(new Set())
  const leaveTimersRef = useRef<Map<string, number>>(new Map())
  const leaderReadyTimerRef = useRef<number | null>(null)
  const initialLogsRef = useRef<LogEntry[] | null>(null)
  const initialKnownUsersRef = useRef<KnownUser[] | null>(null)
  const hasHydratedRef = useRef(false)
  const formatTimestampRef = useRef(formatTimestamp)
  const maxEntriesRef = useRef(maxEntries)

  const allUsers = useMemo(() => {
    const list = [...remoteUsers]
    if (localUser) list.unshift(localUser)
    return list
  }, [localUser, remoteUsers])

  const resolveDisplayName = useCallback(
    (user: { displayName: string }) => user.displayName || displayNameFallback,
    [displayNameFallback],
  )

  // --- ref 同期 ---

  useEffect(() => {
    formatTimestampRef.current = formatTimestamp
  }, [formatTimestamp])

  useEffect(() => {
    maxEntriesRef.current = maxEntries
  }, [maxEntries])

  // --- ハイドレーション検出 ---

  useEffect(() => {
    if (initialLogsRef.current === null) {
      initialLogsRef.current = logs
      if (logs.length > 0) hasHydratedRef.current = true
    }
  }, [logs])

  useEffect(() => {
    if (initialKnownUsersRef.current === null) {
      initialKnownUsersRef.current = knownUsers
      if (knownUsers.length > 0) hasHydratedRef.current = true
    }
  }, [knownUsers])

  useEffect(() => {
    if (initialLogsRef.current && logs !== initialLogsRef.current) {
      hasHydratedRef.current = true
    }
  }, [logs])

  useEffect(() => {
    if (initialKnownUsersRef.current && knownUsers !== initialKnownUsersRef.current) {
      hasHydratedRef.current = true
    }
  }, [knownUsers])

  useEffect(() => {
    if (hasHydratedRef.current) {
      setLeaderReady(true)
    }
  }, [logs, knownUsers])

  // --- タイマー管理 ---

  const clearLeaveTimers = useCallback(() => {
    for (const timerId of leaveTimersRef.current.values()) {
      clearTimeout(timerId)
    }
    leaveTimersRef.current.clear()
  }, [])

  const appendLogs = useCallback((newEntries: LogEntry[]) => {
    if (newEntries.length === 0) return

    setLogs((prevLogs) => {
      const seen = new Set(prevLogs.map((e) => e.id))
      const merged = [...prevLogs]
      for (const entry of newEntries) {
        if (seen.has(entry.id)) continue
        seen.add(entry.id)
        merged.push(entry)
      }
      return merged.slice(-maxEntriesRef.current)
    })
  }, [setLogs])

  // --- JOIN 処理 ---

  useEffect(() => {
    if (!localUser) return
    if (allUsers.length === 0) return

    const nowMs = Date.now()
    const leaderUserId = getLeaderUserId(allUsers)
    const isLeader = leaderUserId === localUser.id

    isLeaderRef.current = isLeader

    if (leaderRef.current !== leaderUserId) {
      leaderRef.current = leaderUserId
      leaderSinceMsRef.current = nowMs
      clearLeaveTimers()

      if (leaderReadyTimerRef.current !== null) {
        clearTimeout(leaderReadyTimerRef.current)
        leaderReadyTimerRef.current = null
      }
      setLeaderReady(false)
      // タイマーでの書き込み解禁は「自分だけがいる」場合のみに限定する。
      // 既に他ユーザーがいるのに未ハイドレーションのまま書き込むと、
      // 既存ログ/knownUsers を空で上書きする事故が起こり得る。
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
    currentUserIdsRef.current = new Set(currentUsersById.keys())

    setKnownUsers((prevKnownUsers) => {
      const prevByUserId = new Map(prevKnownUsers.map((u) => [u.userId, u]))
      const nextKnownUsers: KnownUser[] = [...prevKnownUsers]
      const joinEntries: LogEntry[] = []

      for (let i = 0; i < nextKnownUsers.length; i += 1) {
        const user = nextKnownUsers[i]
        const current = currentUsersById.get(user.userId)
        if (!current) continue
        if (user.displayName !== current.displayName || user.avatarUrl !== current.avatarUrl) {
          nextKnownUsers[i] = {
            ...user,
            displayName: current.displayName,
            avatarUrl: current.avatarUrl,
          }
        }
      }

      for (const [userId, current] of currentUsersById) {
        if (prevByUserId.has(userId)) continue

        const joinedAt = formatTimestampRef.current()
        nextKnownUsers.push({
          userId,
          displayName: current.displayName,
          avatarUrl: current.avatarUrl,
          joinedAt,
        })

        joinEntries.push({
          id: `join-${userId}-${joinedAt}`,
          userId,
          displayName: current.displayName,
          type: 'join',
          timestamp: formatTimestampRef.current(),
          avatarUrl: current.avatarUrl,
        })
      }

      appendLogs(joinEntries)
      return nextKnownUsers
    })
  }, [
    allUsers,
    appendLogs,
    clearLeaveTimers,
    leaderReady,
    leaderHydrationGraceMs,
    localUser,
    resolveDisplayName,
    setKnownUsers,
  ])

  // --- LEAVE 処理 ---

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

    for (const userId of currentUserIds) {
      const timerId = leaveTimersRef.current.get(userId)
      if (timerId !== undefined) {
        clearTimeout(timerId)
        leaveTimersRef.current.delete(userId)
      }
    }

    for (const known of knownUsers) {
      if (currentUserIds.has(known.userId)) continue
      if (leaveTimersRef.current.has(known.userId)) continue

      const timerId = window.setTimeout(() => {
        if (!isLeaderRef.current) return
        if (currentUserIdsRef.current.has(known.userId)) return

        const leftAt = formatTimestampRef.current()

        setKnownUsers((prevKnownUsers) => {
          const stillThere = prevKnownUsers.some((u) => u.userId === known.userId)
          if (!stillThere) return prevKnownUsers

          appendLogs([
            {
              id: `leave-${known.userId}-${known.joinedAt}`,
              userId: known.userId,
              displayName: known.displayName,
              type: 'leave',
              timestamp: leftAt,
              avatarUrl: known.avatarUrl,
            },
          ])

          return prevKnownUsers.filter((u) => u.userId !== known.userId)
        })

        leaveTimersRef.current.delete(known.userId)
      }, leaveGraceMs)

      leaveTimersRef.current.set(known.userId, timerId)
    }
  }, [
    allUsers,
    appendLogs,
    knownUsers,
    leaderReady,
    leaveGraceMs,
    localUser,
    setKnownUsers,
  ])

  // --- クリーンアップ ---

  useEffect(() => {
    return () => {
      if (leaderReadyTimerRef.current !== null) {
        clearTimeout(leaderReadyTimerRef.current)
        leaderReadyTimerRef.current = null
      }
      clearLeaveTimers()
    }
  }, [clearLeaveTimers])

  return { logs, localUser }
}
