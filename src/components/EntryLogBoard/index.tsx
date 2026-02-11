import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RigidBody } from '@react-three/rapier'
import { Text, useTexture } from '@react-three/drei'
import { useXRift } from '../../contexts/XRiftContext'
import { useUsers } from '../../contexts/UsersContext'
import { useInstanceState } from '../../hooks/useInstanceState'

import { DEFAULT_COLORS, DEFAULT_KNOWN_USERS, DEFAULT_LABELS, DEFAULT_LOGS, DEFAULT_PLACEHOLDER_ENTRIES } from './constants'
import type {
  KnownUser,
  LogEntry,
  Props,
} from './types'
import {
  defaultFormatTimestamp,
  getLeaderUserId,
} from './utils'

export type {
  Colors as EntryLogBoardColors,
  Labels as EntryLogBoardLabels,
  Props as EntryLogBoardProps,
  KnownUser,
  LogEntry,
} from './types'

const AvatarIcon: React.FC<{
  url: string
  size: number
  position: [number, number, number]
}> = ({ url, size, position }) => {
  const texture = useTexture(url)
  return (
    <mesh position={position}>
      <circleGeometry args={[size / 2, 32]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

export const EntryLogBoard: React.FC<Props> = ({
  position = [0, 1.5, 0],
  rotation = [0, 0, 0],
  scale = 1,
  maxEntries = 20,
  stateNamespace = 'entry-log',
  leaveGraceMs = 5_000,
  leaderHydrationGraceMs = 3_000,
  chimeFileName = 'chime.mp3',
  labels,
  colors,
  placeholderEntries,
  displayNameFallback = 'ユーザー',
  formatTimestamp = defaultFormatTimestamp,
}) => {
  const resolvedLabels = useMemo(() => ({
    ...DEFAULT_LABELS,
    ...labels,
  }), [labels])

  const resolvedColors = useMemo(() => ({
    ...DEFAULT_COLORS,
    ...colors,
  }), [colors])

  const placeholderLogEntries = useMemo(
    () => placeholderEntries ?? DEFAULT_PLACEHOLDER_ENTRIES,
    [placeholderEntries],
  )

  const logsStateKey = `${stateNamespace}-logs`
  const knownUsersStateKey = `${stateNamespace}-known-users`

  const { baseUrl } = useXRift()
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
  const formatTimestampRef = useRef<() => string>(formatTimestamp)
  const maxEntriesRef = useRef(maxEntries)
  const chimeAudioRef = useRef<HTMLAudioElement | null>(null)
  const chimeDisabledRef = useRef(false)
  const prevLogsLenRef = useRef<number | null>(null)
  const chimeArmedRef = useRef(false)

  const chimeUrl = useMemo(() => {
    const normalized = chimeFileName.startsWith('/') ? chimeFileName.slice(1) : chimeFileName
    return `${baseUrl}${normalized}`
  }, [baseUrl, chimeFileName])

  const allUsers = useMemo(() => {
    const list = [...remoteUsers]
    if (localUser) list.unshift(localUser)
    return list
  }, [localUser, remoteUsers])

  const resolveDisplayName = useCallback(
    (user: { displayName: string }) => user.displayName || displayNameFallback,
    [displayNameFallback],
  )

  // ハイドレーション検出の初期化
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
    formatTimestampRef.current = formatTimestamp
  }, [formatTimestamp])

  useEffect(() => {
    maxEntriesRef.current = maxEntries
  }, [maxEntries])

  useEffect(() => {
    // チャイム音は存在しない可能性があるため、読み込み失敗は無視する。
    // また、音声再生はブラウザ側でユーザー操作が必要な場合があるため、
    // play() が拒否されてもエラー扱いにしない。
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
    // ログ更新の差分を見て「参加者が増えた」タイミングのみチャイムを鳴らす。
    // - 一度に増えた人数が多くても1回だけ
    // - leave は無視（join が増えた時だけ鳴らす）
    // - 自分自身の join では鳴らさない
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

    const hasJoinOther = delta.some((e) => e.type === 'join' && e.userId !== localUser?.id)
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
  }, [logs, localUser])

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

    // リーダー交代直後に未同期 state を送って上書きしないように待つ
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

    // JOIN を処理（存在しなければ KnownUser に追加 + ログ追加）
    setKnownUsers((prevKnownUsers) => {
      const prevByUserId = new Map(prevKnownUsers.map((u) => [u.userId, u]))
      const nextKnownUsers: KnownUser[] = [...prevKnownUsers]
      const joinEntries: LogEntry[] = []

      // 既存ユーザーの表示名/アバター更新
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

        setKnownUsers((prevKnownUsers) => {
          // 既に消えていたら何もしない
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

  useEffect(() => {
    return () => {
      if (leaderReadyTimerRef.current !== null) {
        clearTimeout(leaderReadyTimerRef.current)
        leaderReadyTimerRef.current = null
      }
      clearLeaveTimers()
    }
  }, [clearLeaveTimers])

  const boardWidth = 2 * scale
  const boardHeight = 3 * scale
  const headerHeight = 0.32 * scale
  const padding = 0.09 * scale
  const lineHeight = 0.1245 * scale
  const textZ = 0.006 * scale
  const avatarSize = 0.09 * scale

  const rows = useMemo(() => {
    const source = logs.length ? logs : placeholderLogEntries
    const visible = Math.max(4, Math.floor((boardHeight - headerHeight - padding * 2) / lineHeight))
    return [...source].slice(-visible).reverse()
  }, [logs, placeholderLogEntries, boardHeight, headerHeight, padding, lineHeight])

  const timestampX = (-boardWidth / 2) + padding
  const typeX = timestampX + 0.75 * scale
  const avatarX = typeX + 0.20 * scale
  const nameX = avatarX + avatarSize + 0.02 * scale
  const startY = (boardHeight / 2) - headerHeight - padding - (lineHeight / 2)

  return (
    <RigidBody
      type="fixed"
      colliders="cuboid"
      position={position}
      rotation={rotation}
    >
      {/* 全体背景 */}
      <mesh>
        <boxGeometry args={[boardWidth, boardHeight, 0.01 * scale]} />
        <meshStandardMaterial color={resolvedColors.background} />
      </mesh>

      {/* ヘッダー - 背景*/}
      <mesh position={[0, (boardHeight / 2) - (headerHeight / 2), 0.006 * scale]}>
        <planeGeometry args={[boardWidth, headerHeight]} />
        <meshStandardMaterial color={resolvedColors.header} />
      </mesh>

      {/* ヘッダー - タイトル */}
      <Text
        position={[0, (boardHeight / 2) - (headerHeight / 2), textZ + 0.001 * scale]}
        color={resolvedColors.title}
        fontSize={0.15 * scale}
        anchorX="center"
        anchorY="middle"
        maxWidth={boardWidth - padding * 2}
      >
        {resolvedLabels.title}
      </Text>

      {rows.map((entry, index) => {
        const y = startY - (index * lineHeight)
        const typeLabel = entry.type === 'join' ? resolvedLabels.join : resolvedLabels.leave
        const typeColor = entry.type === 'join' ? resolvedColors.join : resolvedColors.leave

        return (
          <group key={entry.id} position={[0, 0, textZ]}>
            {/* タイムスタンプ */}
            <Text
              position={[timestampX, y, 0]}
              color={resolvedColors.timestamp}
              fontSize={0.0711 * scale}
              anchorX="left"
              anchorY="middle"
            >
              {entry.timestamp}
            </Text>

            {/* JOIN/OUT */}
            <Text
              position={[typeX, y, 0]}
              color={typeColor}
              fontSize={0.0711 * scale}
              anchorX="left"
              anchorY="middle"
            >
              {typeLabel}
            </Text>

            {/* アバターアイコン */}
            {entry.avatarUrl && (
              <AvatarIcon url={entry.avatarUrl} size={avatarSize} position={[avatarX, y, textZ]} />
            )}

            {/* ユーザー名 */}
            <Text
              position={[nameX, y, 0]}
              color={resolvedColors.text}
              fontSize={0.0711 * scale}
              anchorX="left"
              anchorY="middle"
              maxWidth={boardWidth - (nameX - (-boardWidth / 2)) - padding}
            >
              {entry.displayName}
            </Text>
          </group>
        )
      })}
    </RigidBody>
  )
}
