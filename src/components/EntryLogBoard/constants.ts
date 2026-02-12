import { type Colors, type Labels, type LogEntry } from './types'

export const DEFAULT_STATE_NAMESPACE = 'entry-log'

export const DEFAULT_MAX_ENTRIES = 20

export const DEFAULT_DISPLAY_NAME_FALLBACK = 'Unknown'

export const DEFAULT_LABELS: Labels = {
  join: '入室',
  leave: '退室',
}

export const DEFAULT_COLORS: Colors = {
  join: '#4CAF50',
  leave: '#F44336',
  background: '#1a1a2e',
  text: '#ffffff',
}

/** useInstanceState / useState の初期値（参照同一性を保証） */
export const DEFAULT_LOGS: LogEntry[] = []
