import { useSyncExternalStore } from 'react'
import type { DevDialogStore } from './store'
import { TextInputField } from './TextInputField'

interface Props {
  store: DevDialogStore
}

/**
 * TextInput（3D の入力欄）を押したときの文字入力（本番の TextInputOverlay と同じ見た目・操作）。
 * Enter か ✓ で確定、Esc か外側のクリックでやめる。VR 中は先に VR を抜けてから出る
 */
export function TextInputOverlay({ store }: Props) {
  const request = useSyncExternalStore(store.subscribe, () => store.getState().textInput, () => null)
  if (!request) return null
  return <TextInputField key={request.id + (request.initialValue ?? '')} request={request} store={store} />
}
