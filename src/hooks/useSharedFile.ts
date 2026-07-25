import { useCallback } from 'react'
import {
  type SharedFileContextValue,
  type UpdateSharedFileParams,
  type UploadSharedFileOptions,
  useSharedFileContext,
} from '../contexts/SharedFileContext'

/**
 * 共有ファイルのアップロード・一覧取得・ロック操作・情報更新・削除を行うhook
 * ワールド作成者が3D空間内から共有ファイルを操作するために使用
 *
 * @example
 * const { uploadSharedFile, getSharedFiles, setSharedFileLock, updateSharedFile, deleteSharedFile } = useSharedFile()
 *
 * const handleUpload = async (file: File) => {
 *   // アップロード時に説明文・メタデータを付与できる
 *   const result = await uploadSharedFile(
 *     file,
 *     (progress) => console.log(`${progress}%`),
 *     { description: '展示品A', metadata: { exhibit: 'pedestal-1' } },
 *   )
 *   console.log('URL:', result.publicUrl)
 *   // アップロード直後にロックして誤削除を防ぐ
 *   await setSharedFileLock(result.id, true)
 * }
 *
 * // 説明文・メタデータの更新（null でクリア）
 * await updateSharedFile(fileId, { description: '展示品B', metadata: null })
 *
 * // 削除（ロック中は先に解除が必要）
 * await setSharedFileLock(fileId, false)
 * await deleteSharedFile(fileId)
 *
 * @returns {{ uploadSharedFile, getSharedFiles, setSharedFileLock, updateSharedFile, deleteSharedFile }}
 */
export const useSharedFile = (): {
  uploadSharedFile: SharedFileContextValue['uploadSharedFile']
  getSharedFiles: SharedFileContextValue['getSharedFiles']
  setSharedFileLock: SharedFileContextValue['setSharedFileLock']
  updateSharedFile: SharedFileContextValue['updateSharedFile']
  deleteSharedFile: SharedFileContextValue['deleteSharedFile']
} => {
  const { uploadSharedFile, getSharedFiles, setSharedFileLock, updateSharedFile, deleteSharedFile } =
    useSharedFileContext()

  const stableUploadSharedFile = useCallback(
    (file: File, onProgress?: (progress: number) => void, options?: UploadSharedFileOptions) =>
      uploadSharedFile(file, onProgress, options),
    [uploadSharedFile],
  )

  const stableGetSharedFiles = useCallback(() => getSharedFiles(), [getSharedFiles])

  const stableSetSharedFileLock = useCallback(
    (fileId: string, locked: boolean) => setSharedFileLock(fileId, locked),
    [setSharedFileLock],
  )

  const stableUpdateSharedFile = useCallback(
    (fileId: string, updates: UpdateSharedFileParams) => updateSharedFile(fileId, updates),
    [updateSharedFile],
  )

  const stableDeleteSharedFile = useCallback(
    (fileId: string) => deleteSharedFile(fileId),
    [deleteSharedFile],
  )

  return {
    uploadSharedFile: stableUploadSharedFile,
    getSharedFiles: stableGetSharedFiles,
    setSharedFileLock: stableSetSharedFileLock,
    updateSharedFile: stableUpdateSharedFile,
    deleteSharedFile: stableDeleteSharedFile,
  }
}
