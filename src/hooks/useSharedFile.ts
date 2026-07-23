import { useCallback } from 'react'
import {
  type SharedFileContextValue,
  type UpdateSharedFileParams,
  type UploadSharedFileOptions,
  useSharedFileContext,
} from '../contexts/SharedFileContext'

/**
 * 共有ファイルのアップロード・一覧取得・ロック操作・情報更新を行うhook
 * ワールド作成者が3D空間内から共有ファイルを操作するために使用
 *
 * @example
 * const { uploadSharedFile, getSharedFiles, setSharedFileLock, updateSharedFile } = useSharedFile()
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
 * @returns {{ uploadSharedFile, getSharedFiles, setSharedFileLock, updateSharedFile }}
 */
export const useSharedFile = (): {
  uploadSharedFile: SharedFileContextValue['uploadSharedFile']
  getSharedFiles: SharedFileContextValue['getSharedFiles']
  setSharedFileLock: SharedFileContextValue['setSharedFileLock']
  updateSharedFile: SharedFileContextValue['updateSharedFile']
} => {
  const { uploadSharedFile, getSharedFiles, setSharedFileLock, updateSharedFile } =
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

  return {
    uploadSharedFile: stableUploadSharedFile,
    getSharedFiles: stableGetSharedFiles,
    setSharedFileLock: stableSetSharedFileLock,
    updateSharedFile: stableUpdateSharedFile,
  }
}
