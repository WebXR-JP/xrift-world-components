import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { XRStore } from '@react-three/xr'
import { injectDevXREmulator } from './emulator'

interface Props {
  store: XRStore
}

const buttonStyle: React.CSSProperties = {
  position: 'absolute',
  // 右下・左下はエミュレーターのコントローラーの操作パネルと重なるので、下の真ん中に置く
  left: '50%',
  bottom: 16,
  transform: 'translateX(-50%)',
  padding: '10px 16px',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: 8,
  background: 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  font: '600 14px/1 system-ui, sans-serif',
  cursor: 'pointer',
  zIndex: 1000,
}

/**
 * VR に入る／出るボタン。VR に入れないブラウザでは出さない。
 * localhost でヘッドセットが無いときはエミュレーター（Meta Quest 3 相当）を入れるので、PC でも押せる
 */
export function EnterVRButton({ store }: Props) {
  const [supported, setSupported] = useState(false)
  const isInVR = useSyncExternalStore(
    store.subscribe,
    () => store.getState().session != null,
    () => false,
  )

  useEffect(() => {
    let cancelled = false
    // ヘッドセットが無ければエミュレーターを入れてから、VR に入れるかを確かめる
    injectDevXREmulator()
      .then(() => navigator.xr?.isSessionSupported('immersive-vr') ?? false)
      .catch(() => false)
      .then((ok) => {
        if (!cancelled) setSupported(ok)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleClick = useCallback(() => {
    const session = store.getState().session
    if (session) {
      void session.end()
      return
    }
    store.enterVR().catch((error: unknown) => {
      console.error('[DevEnvironment] VR に入れませんでした', error)
    })
  }, [store])

  if (!supported) return null
  return (
    <button type="button" style={buttonStyle} onClick={handleClick}>
      {isInVR ? 'VR を終了' : 'VR に入る'}
    </button>
  )
}
