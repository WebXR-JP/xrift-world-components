import type { Colors, KnownUser, Labels, LogEntry } from './types'

export const DEFAULT_LABELS: Required<Labels> = {
  title: '入退室ログ',
  join: 'in',
  leave: 'out',
}

export const DEFAULT_COLORS: Required<Colors> = {
  background: '#3c3b36',
  header: '#5246a5',
  title: '#ffffff',
  timestamp: '#c3c3c3',
  text: '#f5f5f5',
  join: '#32c671',
  leave: '#828282',
}

export const DEFAULT_PLACEHOLDER_ENTRIES: LogEntry[] = []

export const DEFAULT_LOGS: LogEntry[] = []

export const DEFAULT_KNOWN_USERS: KnownUser[] = []
