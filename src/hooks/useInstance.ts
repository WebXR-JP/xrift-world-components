import { useCallback, useEffect, useState } from 'react'
import { useConfirmContext } from '../contexts/ConfirmContext'
import { type InstanceInfo, useInstanceContext } from '../contexts/InstanceContext'

/**
 * インスタンス情報の取得・確認付き遷移を提供するフック
 *
 * @example
 * const { info, navigateWithConfirm } = useInstance('instance-id')
 *
 * // インスタンス情報を表示
 * <Text>{info?.world.name}</Text>
 *
 * // 確認モーダル付きで遷移
 * <PortalPedestal onEnter={navigateWithConfirm} />
 */
export const useInstance = (instanceId: string) => {
  const { getInstanceInfo, navigateToInstance } = useInstanceContext()
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
        console.warn('[useInstance] Failed to fetch instance info:', err)
      })
    return () => {
      cancelled = true
    }
  }, [instanceId, getInstanceInfo])

  // 確認モーダル付きのインスタンス遷移
  const navigateWithConfirm = useCallback(async () => {
    try {
      const latestInfo = await getInstanceInfo(instanceId)
      const confirmed = await requestConfirm({
        title: latestInfo.world.name,
        message: `「${latestInfo.name}」に移動しますか？\n👥 ${latestInfo.currentUsers}/${latestInfo.maxCapacity}`,
        confirmLabel: '移動する',
        cancelLabel: 'キャンセル',
      })
      if (confirmed) navigateToInstance(instanceId)
    } catch (err) {
      console.warn('[useInstance] Failed to navigate:', err)
    }
  }, [instanceId, getInstanceInfo, navigateToInstance, requestConfirm])

  return { info, navigateWithConfirm }
}
