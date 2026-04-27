import { createContext, useContext, type ReactNode } from 'react'

/**
 * ファイル入力のエラー種別
 */
export type FileInputErrorType = 'file_too_large' | 'invalid_type'

/**
 * ファイル入力のエラー情報
 */
export interface FileInputError {
  type: FileInputErrorType
  message: string
}

/**
 * ファイル入力のリクエスト情報
 */
export interface FileInputRequest {
  /** 入力の一意なID */
  id: string
  /** 受け入れるファイルタイプ（例: '.vrm', 'image/*'） */
  accept?: string
  /** 複数ファイル選択を許可するか */
  multiple?: boolean
  /** 最大ファイルサイズ（バイト単位） */
  maxSize?: number
  /** ファイル選択完了時のコールバック */
  onSelect: (files: File[]) => void
  /** キャンセル時のコールバック */
  onCancel?: () => void
  /** エラー時のコールバック */
  onError?: (error: FileInputError) => void
}

/**
 * ファイル入力のContext値
 */
export interface FileInputContextValue {
  /**
   * ファイル選択ダイアログを表示する
   * xrift-frontend側でオーバーレイUIを表示し、ファイル選択後にonSelectが呼ばれる
   */
  requestFileInput: (request: FileInputRequest) => void
  /**
   * 現在アクティブなファイル入力があるか
   */
  isActive: boolean
}

/**
 * デフォルトの実装（開発環境用）
 * 動的にinput[type=file]を作成してファイル選択する
 */
export const createDefaultFileInputImplementation = (): FileInputContextValue => ({
  requestFileInput: (request) => {
    console.log('[FileInput] requestFileInput called:', request)
    const input = document.createElement('input')
    input.type = 'file'
    if (request.accept) input.accept = request.accept
    if (request.multiple) input.multiple = true

    input.addEventListener('change', () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) {
        request.onCancel?.()
        return
      }
      if (request.maxSize) {
        const oversized = files.find((f) => f.size > request.maxSize!)
        if (oversized) {
          request.onError?.({
            type: 'file_too_large',
            message: `File "${oversized.name}" exceeds max size of ${request.maxSize} bytes`,
          })
          return
        }
      }
      request.onSelect(files)
    })

    input.click()
  },
  isActive: false,
})

/**
 * ファイル入力のContext
 */
export const FileInputContext = createContext<FileInputContextValue | null>(null)

interface Props {
  value: FileInputContextValue
  children: ReactNode
}

/**
 * ファイル入力のContextProvider
 */
export const FileInputProvider = ({ value, children }: Props) => {
  return <FileInputContext.Provider value={value}>{children}</FileInputContext.Provider>
}

/**
 * ファイル入力の機能を取得するhook
 *
 * @example
 * const { requestFileInput } = useFileInputContext()
 * requestFileInput({
 *   id: 'avatar-upload',
 *   accept: '.vrm',
 *   maxSize: 30 * 1024 * 1024,
 *   onSelect: (files) => console.log('選択されたファイル:', files),
 * })
 *
 * @throws {Error} FileInputProvider の外で呼び出された場合
 */
export const useFileInputContext = (): FileInputContextValue => {
  const context = useContext(FileInputContext)

  if (!context) {
    throw new Error('useFileInputContext must be used within FileInputProvider')
  }

  return context
}
