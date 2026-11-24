import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { DEV_OVERLAY_ATTRIBUTE } from '../../utils'
import type { DevDialogStore } from './store'
import {
  actionsStyle,
  closeButtonStyle,
  headerStyle,
  messageStyle,
  modalStyle,
  overlayStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  titleStyle,
} from './styles'

interface Props {
  store: DevDialogStore
  /** VR 中は出さない（VR では VRConfirmPanel が目の前に出す。エミュレーターでは画面に重なって隠してしまう） */
  hidden: boolean
}

/** クリックがクロスヘアのインタラクト・ポインターロックの取り直し（window / document）に届かないようにする */
const stopPropagation = (event: MouseEvent) => event.stopPropagation()
const overlayAttributes = { [DEV_OVERLAY_ATTRIBUTE]: '' }

/**
 * useConfirm() の確認画面（PC）。本番の ConfirmDialog と同じ見た目・操作（Esc でキャンセル、Enter で OK）
 */
export function ConfirmModal({ store, hidden }: Props) {
  const request = useSyncExternalStore(store.subscribe, () => store.getState().confirm, () => null)
  const messageRef = useRef<HTMLParagraphElement>(null)

  // 開いたらポインターロックを外し、フォーカスを本文へ（Space のジャンプでボタンを押させない。本番と同じ）
  useEffect(() => {
    if (!request || hidden) return
    document.exitPointerLock?.()
    messageRef.current?.focus()
  }, [request, hidden])

  const handleCancel = useCallback(() => store.answerConfirm(false), [store])
  const handleConfirm = useCallback(() => store.answerConfirm(true), [store])
  const handleOverlayClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      if (event.target === event.currentTarget) store.answerConfirm(false)
    },
    [store],
  )
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') store.answerConfirm(false)
      if (event.key === 'Enter') store.answerConfirm(true)
    },
    [store],
  )

  if (!request || hidden) return null
  return (
    <div
      {...overlayAttributes}
      style={overlayStyle}
      onMouseDown={stopPropagation}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
    >
      <div style={modalStyle} role="dialog" aria-modal="true" aria-label={request.title}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>{request.title}</h2>
          <button type="button" style={closeButtonStyle} onClick={handleCancel} aria-label="閉じる">
            ×
          </button>
        </div>
        <p ref={messageRef} tabIndex={-1} style={messageStyle}>
          {request.message}
        </p>
        <div style={actionsStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={handleCancel}>
            {request.cancelLabel}
          </button>
          <button type="button" style={primaryButtonStyle} onClick={handleConfirm}>
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
