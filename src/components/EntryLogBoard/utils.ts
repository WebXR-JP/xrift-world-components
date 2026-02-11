import type { KnownUser, LogEntry } from './types'

export const defaultFormatTimestamp = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const MM = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${hh}:${min}:${ss}`
}

export const getLeaderUserId = (users: Array<{ id: string }>) =>
  users.map((user) => user.id).sort()[0]

export const mergeLogs = (
  prevLogs: LogEntry[],
  newEntries: LogEntry[],
  maxEntries: number,
): LogEntry[] => {
  const seen = new Set(prevLogs.map((e) => e.id))
  const merged = [...prevLogs]
  for (const entry of newEntries) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    merged.push(entry)
  }
  return merged.slice(-maxEntries)
}

interface UserInfo {
  displayName: string
  avatarUrl: string | null
}

export const processJoins = (
  prevKnownUsers: KnownUser[],
  currentUsersById: Map<string, UserInfo>,
  formatTimestamp: () => string,
): { nextKnownUsers: KnownUser[]; joinEntries: LogEntry[] } => {
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

  // 新規ユーザーを追加
  for (const [userId, current] of currentUsersById) {
    if (prevByUserId.has(userId)) continue

    const joinedAt = formatTimestamp()
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
      timestamp: formatTimestamp(),
      avatarUrl: current.avatarUrl,
    })
  }

  return { nextKnownUsers, joinEntries }
}

export const buildLeaveEntry = (known: KnownUser, timestamp: string): LogEntry => ({
  id: `leave-${known.userId}-${known.joinedAt}`,
  userId: known.userId,
  displayName: known.displayName,
  type: 'leave',
  timestamp,
  avatarUrl: known.avatarUrl,
})
