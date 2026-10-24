import { useMemo } from 'react'
import { type ViewpointContextValue, useViewpointContext } from '../contexts/ViewpointContext'

export interface UseViewpointResult extends ViewpointContextValue {
  /** 三人称か（`viewpoint === 'third-person'`） */
  isThirdPerson: boolean
}

/**
 * 自分のカメラが一人称か三人称かを返すフック
 *
 * PC・スマホではプレイヤーがホイール（ピンチ）で一人称と三人称を切り替えられる。
 * VR は常に一人称。撮影（カメラモード）のプレビュー中も一人称を返す。
 *
 * 指針:
 * - 表示の出し分けは `isThirdPerson`（切り替わると再レンダーされる）
 * - 毎フレームの処理では `getViewpoint()` を呼ぶ（再レンダーなしで最新の値が取れる）
 *
 * @example
 * // 一人称のときだけゴーグルの枠を出し、三人称では頭上に矢印を出す
 * const { isThirdPerson } = useViewpoint()
 * return isThirdPerson ? <ArrowAboveMe /> : <GogglesFrame />
 *
 * @example
 * // 毎フレーム見る
 * const { getViewpoint } = useViewpoint()
 * useFrame(() => {
 *   crosshair.current.visible = getViewpoint() === 'first-person'
 * })
 *
 * @throws {Error} XRiftProvider の外で呼び出された場合
 */
export const useViewpoint = (): UseViewpointResult => {
  const context = useViewpointContext()
  // 視点が変わったときだけ参照を変える（戻り値を effect の依存に入れても毎回走らない）
  return useMemo(
    () => ({ ...context, isThirdPerson: context.viewpoint === 'third-person' }),
    [context],
  )
}
