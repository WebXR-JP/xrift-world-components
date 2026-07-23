import { createContext, useContext, type ReactNode } from 'react'

/**
 * 共有ファイルの情報
 */
export interface SharedFileInfo {
  id: string
  fileName: string
  contentType: string
  fileSize: number
  publicUrl: string
  locked: boolean
  createdAt: string
}

/**
 * 共有ファイルのContext値
 */
export interface SharedFileContextValue {
  /**
   * ファイルをアップロードし、結果を返す
   */
  uploadSharedFile: (
    file: File,
    onProgress?: (progress: number) => void,
  ) => Promise<SharedFileInfo>
  /**
   * 共有ファイル一覧を取得する
   */
  getSharedFiles: () => Promise<SharedFileInfo[]>
  /**
   * 共有ファイルのロック状態（削除保護）を設定する
   */
  setSharedFileLock: (fileId: string, locked: boolean) => Promise<SharedFileInfo>
}

/**
 * デフォルトの実装（開発環境用）
 * console.log + ダミーデータを返す
 */
export const createDefaultSharedFileImplementation = (): SharedFileContextValue => ({
  uploadSharedFile: async (file) => {
    console.log('[SharedFile] uploadSharedFile called:', file.name)
    return {
      id: 'dummy-id',
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      publicUrl: `https://example.com/shared/${file.name}`,
      locked: false,
      createdAt: new Date().toISOString(),
    }
  },
  getSharedFiles: async () => {
    console.log('[SharedFile] getSharedFiles called')
    return []
  },
  setSharedFileLock: async (fileId, locked) => {
    console.log('[SharedFile] setSharedFileLock called:', fileId, locked)
    return {
      id: fileId,
      fileName: 'dummy-file',
      contentType: 'application/octet-stream',
      fileSize: 0,
      publicUrl: 'https://example.com/shared/dummy-file',
      locked,
      createdAt: new Date().toISOString(),
    }
  },
})

/**
 * 共有ファイルのContext
 */
export const SharedFileContext = createContext<SharedFileContextValue | null>(null)

interface Props {
  value: SharedFileContextValue
  children: ReactNode
}

/**
 * 共有ファイルのContextProvider
 */
export const SharedFileProvider = ({ value, children }: Props) => {
  return <SharedFileContext.Provider value={value}>{children}</SharedFileContext.Provider>
}

/**
 * 共有ファイルの機能を取得するhook
 *
 * @example
 * const { uploadSharedFile, getSharedFiles } = useSharedFileContext()
 * const result = await uploadSharedFile(file, (progress) => console.log(progress))
 * console.log('URL:', result.publicUrl)
 *
 * @throws {Error} SharedFileProvider の外で呼び出された場合
 */
export const useSharedFileContext = (): SharedFileContextValue => {
  const context = useContext(SharedFileContext)

  if (!context) {
    throw new Error('useSharedFileContext must be used within SharedFileProvider')
  }

  return context
}
