import { useCallback } from 'react'
import { type SharedFileContextValue, useSharedFileContext } from '../contexts/SharedFileContext'

/**
 * 共有ファイルのアップロード・一覧取得を行うhook
 * ワールド作成者が3D空間内から共有ファイルを操作するために使用
 *
 * @example
 * const { uploadSharedFile, getSharedFiles } = useSharedFile()
 *
 * const handleUpload = async (file: File) => {
 *   const result = await uploadSharedFile(file, (progress) => {
 *     console.log(`${progress}%`)
 *   })
 *   console.log('URL:', result.publicUrl)
 * }
 *
 * @returns {{ uploadSharedFile, getSharedFiles }}
 */
export const useSharedFile = (): {
  uploadSharedFile: SharedFileContextValue['uploadSharedFile']
  getSharedFiles: SharedFileContextValue['getSharedFiles']
} => {
  const { uploadSharedFile, getSharedFiles } = useSharedFileContext()

  const stableUploadSharedFile = useCallback(
    (file: File, onProgress?: (progress: number) => void) => uploadSharedFile(file, onProgress),
    [uploadSharedFile],
  )

  const stableGetSharedFiles = useCallback(() => getSharedFiles(), [getSharedFiles])

  return { uploadSharedFile: stableUploadSharedFile, getSharedFiles: stableGetSharedFiles }
}
