import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from 'react'
import type { TextInputRequest } from '../../../../contexts/TextInputContext'
import { DEV_OVERLAY_ATTRIBUTE } from '../../utils'
import type { DevDialogStore } from './store'
import { submitButtonStyle, textContainerStyle, textInputStyle, textOverlayStyle } from './styles'
import { DEFAULT_TEXT_MAX_LENGTH, normalizeTextInput } from './utils'

const overlayAttributes = { [DEV_OVERLAY_ATTRIBUTE]: '' }
const stopPropagation = (event: MouseEvent) => event.stopPropagation()

interface Props {
  request: TextInputRequest
  store: DevDialogStore
}

/** 入力欄。リクエストごとに key で作り直し、初期値を入れ直す */
export function TextInputField({ request, store }: Props) {
  const maxLength = request.maxLength ?? DEFAULT_TEXT_MAX_LENGTH
  const [text, setText] = useState(() => request.initialValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  // 開いたらポインターロックを外して入力欄にフォーカス（本番と同じ）
  useEffect(() => {
    document.exitPointerLock?.()
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setText(event.target.value.slice(0, maxLength)),
    [maxLength],
  )
  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      const value = normalizeTextInput(text, maxLength)
      if (value !== null) store.submitTextInput(value)
    },
    [text, maxLength, store],
  )
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') store.cancelTextInput()
    },
    [store],
  )
  const handleOverlayClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      if (event.target === event.currentTarget) store.cancelTextInput()
    },
    [store],
  )

  return (
    <div {...overlayAttributes} style={textOverlayStyle} onMouseDown={stopPropagation} onClick={handleOverlayClick}>
      <form style={textContainerStyle} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={request.placeholder ?? 'テキストを入力...'}
          maxLength={maxLength}
          style={textInputStyle}
        />
        <button
          type="submit"
          style={{ ...submitButtonStyle, opacity: normalizeTextInput(text, maxLength) === null ? 0.5 : 1 }}
          disabled={normalizeTextInput(text, maxLength) === null}
          aria-label="確定"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width={20} height={20}>
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
