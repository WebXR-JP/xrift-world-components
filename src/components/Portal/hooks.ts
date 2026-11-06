import { useCallback, useEffect, useState } from 'react'
import { useConfirmContext } from '../../contexts/ConfirmContext'
import { useInstanceContext } from '../../contexts/InstanceContext'
import { useWorldContext } from '../../contexts/WorldContext'
import { PORTAL_DEFAULTS } from './constants'
import type { PortalInfo, PortalTarget, Props } from './types'
import { buildPortalConfirmOptions, toPortalInfoFromInstance, toPortalInfoFromWorld } from './utils'

/**
 * Propsにデフォルト値を適用して返す
 */
export const usePortalProps = (props: Props) => {
  const {
    instanceId,
    worldId,
    position = PORTAL_DEFAULTS.position,
    rotation = PORTAL_DEFAULTS.rotation,
    disabled = false,
  } = props

  return {
    instanceId,
    worldId,
    position,
    rotation,
    disabled,
  }
}

/**
 * 行き先（部屋 or ワールド）の情報取得と、確認付きの移動。
 * 行き先が取れない（消えた部屋・無いワールド）ときは落とさず notFound にする。
 * notFound でもくぐれば取り直すので、一時的な失敗なら復帰する
 */
export const usePortalTarget = (target: PortalTarget | null) => {
  const { getInstanceInfo, navigateToInstance, navigateToWorld } = useInstanceContext()
  const { getWorldInfo } = useWorldContext()
  const { requestConfirm } = useConfirmContext()
  const [info, setInfo] = useState<PortalInfo | null>(null)
  const [notFound, setNotFound] = useState(false)

  const targetKind = target?.kind
  const targetId = target?.id

  const fetchInfo = useCallback(async (): Promise<PortalInfo> => {
    if (!targetKind || !targetId) throw new Error('[Portal] instanceId か worldId のどちらかが必要です')
    if (targetKind === 'instance') return toPortalInfoFromInstance(await getInstanceInfo(targetId))
    return toPortalInfoFromWorld(await getWorldInfo(targetId))
  }, [targetKind, targetId, getInstanceInfo, getWorldInfo])

  // マウント時・行き先が変わったときに取得
  useEffect(() => {
    let cancelled = false
    setInfo(null)
    setNotFound(false)
    fetchInfo()
      .then((result) => {
        if (!cancelled) setInfo(result)
      })
      .catch((err) => {
        console.warn('[Portal] 行き先の情報を取得できませんでした:', err)
        if (!cancelled) setNotFound(true)
      })
    return () => {
      cancelled = true
    }
  }, [fetchInfo])

  // 確認モーダル付きの移動。最新の人数を出すため取り直す（マウント時に取れなかった行き先の再試行も兼ねる）
  const navigateWithConfirm = useCallback(async () => {
    if (!targetKind || !targetId) return
    let latest: PortalInfo
    try {
      latest = await fetchInfo()
    } catch (err) {
      console.warn('[Portal] 行き先の情報を取得できませんでした:', err)
      setInfo(null)
      setNotFound(true)
      return
    }
    setInfo(latest)
    setNotFound(false)
    try {
      const confirmed = await requestConfirm(buildPortalConfirmOptions(latest))
      if (!confirmed) return
      if (targetKind === 'instance') await navigateToInstance(targetId)
      else await navigateToWorld(targetId)
    } catch (err) {
      // 移動の失敗（満員・レート制限など）は一時的なことが多いので、行き先不明にはしない
      console.warn('[Portal] 移動できませんでした:', err)
    }
  }, [targetKind, targetId, fetchInfo, requestConfirm, navigateToInstance, navigateToWorld])

  return { info, notFound, navigateWithConfirm }
}
