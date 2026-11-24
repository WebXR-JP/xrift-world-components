import type { ConfirmContextValue, ConfirmOptions } from '../../../../contexts/ConfirmContext'
import type { TextInputRequest } from '../../../../contexts/TextInputContext'

/** 表示中の確認（本番の useConfirmImplementation と同じ既定の文言で埋める） */
export interface DevConfirmRequest {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

export interface DevDialogState {
  confirm: DevConfirmRequest | null
  textInput: TextInputRequest | null
}

export interface DevDialogStore {
  getState: () => DevDialogState
  /** 状態変化を購読する（useSyncExternalStore 互換） */
  subscribe: (listener: () => void) => () => void
  /** 確認を出す。押されたボタンで true / false が返る */
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>
  /** 確認に答える（OK なら true） */
  answerConfirm: (ok: boolean) => void
  /** 文字入力を出す（VR 中は先に VR を抜ける） */
  requestTextInput: (request: TextInputRequest) => void
  /** 文字入力を確定する */
  submitTextInput: (value: string) => void
  /** 文字入力をやめる */
  cancelTextInput: () => void
  /** useConfirm() に渡す ConfirmContext の実装 */
  confirmContextValue: ConfirmContextValue
}

interface Options {
  /** 文字入力を出す前に呼ぶ（VR 中ならイマーシブを抜ける。本番と同じ） */
  beforeTextInput?: () => Promise<void>
}

/**
 * DevEnvironment の確認・文字入力（React 非依存）。
 * 本番（xrift-frontend の useConfirmDialogStore・useTextInputStore）と同じく、
 * 新しい確認・入力が来たら前のものはキャンセル扱いにする
 */
export function createDevDialogStore({ beforeTextInput }: Options = {}): DevDialogStore {
  const listeners = new Set<() => void>()
  let state: DevDialogState = { confirm: null, textInput: null }
  let resolveConfirm: ((ok: boolean) => void) | null = null

  const setState = (partial: Partial<DevDialogState>) => {
    state = { ...state, ...partial }
    for (const listener of listeners) listener()
  }

  const answerConfirm = (ok: boolean) => {
    const resolve = resolveConfirm
    resolveConfirm = null
    setState({ confirm: null })
    resolve?.(ok)
  }

  const requestConfirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      if (resolveConfirm) answerConfirm(false)
      resolveConfirm = resolve
      setState({
        confirm: {
          title: options.title ?? '確認',
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'OK',
          cancelLabel: options.cancelLabel ?? 'キャンセル',
        },
      })
    })

  const requestTextInput = (request: TextInputRequest) => {
    void (beforeTextInput?.() ?? Promise.resolve()).then(() => {
      state.textInput?.onCancel?.()
      setState({ textInput: request })
    })
  }

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    requestConfirm,
    answerConfirm,
    requestTextInput,
    submitTextInput: (value) => {
      const request = state.textInput
      setState({ textInput: null })
      request?.onSubmit(value)
    },
    cancelTextInput: () => {
      const request = state.textInput
      setState({ textInput: null })
      request?.onCancel?.()
    },
    confirmContextValue: { requestConfirm },
  }
}
