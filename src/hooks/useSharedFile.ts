import { useCallback } from 'react'
import { type SharedFileContextValue, useSharedFileContext } from '../contexts/SharedFileContext'

/**
 * 共有ファイルのアップロード・一覧取得・ロック操作を行うhook
 * ワールド作成者が3D空間内から共有ファイルを操作するために使用
 *
 * @example
 * const { uploadSharedFile, getSharedFiles, setSharedFileLock } = useSharedFile()
 *
 * const handleUpload = async (file: File) => {
 *   const result = await uploadSharedFile(file, (progress) => {
 *     console.log(`${progress}%`)
 *   })
 *   console.log('URL:', result.publicUrl)
 *   // アップロード直後にロックして誤削除を防ぐ
 *   await setSharedFileLock(result.id, true)
 * }
 *
 * @returns {{ uploadSharedFile, getSharedFiles, setSharedFileLock }}
 */
export const useSharedFile = (): {
  uploadSharedFile: SharedFileContextValue['uploadSharedFile']
  getSharedFiles: SharedFileContextValue['getSharedFiles']
  setSharedFileLock: SharedFileContextValue['setSharedFileLock']
} => {
  const { uploadSharedFile, getSharedFiles, setSharedFileLock } = useSharedFileContext()

  const stableUploadSharedFile = useCallback(
    (file: File, onProgress?: (progress: number) => void) => uploadSharedFile(file, onProgress),
    [uploadSharedFile],
  )

  const stableGetSharedFiles = useCallback(() => getSharedFiles(), [getSharedFiles])

  const stableSetSharedFileLock = useCallback(
    (fileId: string, locked: boolean) => setSharedFileLock(fileId, locked),
    [setSharedFileLock],
  )

  return {
    uploadSharedFile: stableUploadSharedFile,
    getSharedFiles: stableGetSharedFiles,
    setSharedFileLock: stableSetSharedFileLock,
  }
}
