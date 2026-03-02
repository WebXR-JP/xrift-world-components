import { useCallback, useEffect, useState } from 'react'
import { useConfirmContext } from '../contexts/ConfirmContext'
import { type InstanceInfo, useInstanceInfoContext } from '../contexts/InstanceInfoContext'

/**
 * Portal 内部で使うヘルパーフック
 * instanceId からインスタンス情報を取得し、台座進入時に確認モーダル → 遷移を行う
 */
export const usePortalNavigation = (instanceId: string) => {
  const { getInstanceInfo, navigateToInstance } = useInstanceInfoContext()
  const { requestConfirm } = useConfirmContext()
  const [info, setInfo] = useState<InstanceInfo | null>(null)

  // マウント時にインスタンス情報を取得
  useEffect(() => {
    let cancelled = false
    getInstanceInfo(instanceId)
      .then((result) => {
        if (!cancelled) setInfo(result)
      })
      .catch((err) => {
        console.warn('[Portal] Failed to fetch instance info:', err)
      })
    return () => {
      cancelled = true
    }
  }, [instanceId, getInstanceInfo])

  // 台座進入時の処理
  const enterPortal = useCallback(async () => {
    try {
      const latestInfo = await getInstanceInfo(instanceId)
      const confirmed = await requestConfirm({
        title: latestInfo.worldName,
        message: `「${latestInfo.instanceName}」に移動しますか？\n👥 ${latestInfo.currentUsers}/${latestInfo.maxCapacity}`,
        confirmLabel: '移動する',
        cancelLabel: 'キャンセル',
      })
      if (confirmed) navigateToInstance(instanceId)
    } catch (err) {
      console.warn('[Portal] Failed to enter portal:', err)
    }
  }, [instanceId, getInstanceInfo, navigateToInstance, requestConfirm])

  return { info, enterPortal }
}
