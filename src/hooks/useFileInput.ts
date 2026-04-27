import { useCallback } from 'react'
import { type FileInputRequest, useFileInputContext } from '../contexts/FileInputContext'

/**
 * ファイル選択ダイアログを使用するhook
 * ワールド作成者が3Dオブジェクトのクリックをトリガーにファイル選択を行うために使用
 *
 * @example
 * const { requestFileInput } = useFileInput()
 *
 * const handleClick = () => {
 *   requestFileInput({
 *     id: 'avatar-upload',
 *     accept: '.vrm',
 *     maxSize: 30 * 1024 * 1024,
 *     onSelect: (files) => console.log('選択されたファイル:', files),
 *   })
 * }
 *
 * @returns {{ requestFileInput: (request: FileInputRequest) => void }}
 */
export const useFileInput = (): { requestFileInput: (request: FileInputRequest) => void } => {
  const { requestFileInput } = useFileInputContext()

  const stableRequestFileInput = useCallback(
    (request: FileInputRequest) => {
      requestFileInput(request)
    },
    [requestFileInput],
  )

  return { requestFileInput: stableRequestFileInput }
}
