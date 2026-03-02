import { useCallback } from 'react'
import { type ConfirmOptions, useConfirmContext } from '../contexts/ConfirmContext'

/**
 * 確認モーダルを使用するhook
 * ワールド作成者がユーザーに確認を求めるために使用
 *
 * @example
 * const { requestConfirm } = useConfirm()
 *
 * const handleEnter = async () => {
 *   const ok = await requestConfirm({ message: 'ワールドを移動しますか？' })
 *   if (ok) navigate('/worlds/abc')
 * }
 *
 * @returns {{ requestConfirm: (options: ConfirmOptions) => Promise<boolean> }}
 */
export const useConfirm = (): { requestConfirm: (options: ConfirmOptions) => Promise<boolean> } => {
  const { requestConfirm } = useConfirmContext()

  const stableRequestConfirm = useCallback(
    (options: ConfirmOptions) => {
      return requestConfirm(options)
    },
    [requestConfirm],
  )

  return { requestConfirm: stableRequestConfirm }
}
