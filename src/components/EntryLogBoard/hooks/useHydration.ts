import { useEffect, useRef, useState } from 'react'

export const useHydration = <L, K>(logs: L[], knownUsers: K[]) => {
  const initialLogsRef = useRef<L[] | null>(null)
  const initialKnownUsersRef = useRef<K[] | null>(null)
  const hasHydratedRef = useRef(false)
  const [leaderReady, setLeaderReady] = useState(false)

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

  return { hasHydratedRef, leaderReady, setLeaderReady }
}
