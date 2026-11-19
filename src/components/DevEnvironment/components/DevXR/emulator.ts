/**
 * ヘッドセットが無い PC でも VR を試せるよう、WebXR のエミュレーター（IWER・Meta Quest 3 相当）を入れる。
 *
 * @react-three/xr の createXRStore にも同じ機能（emulate）があるが、iwer 2.8 以降は
 * navigator.xr があるだけで「本物の VR がある」とみなして入れるのをやめてしまう（Chrome は常に navigator.xr を持つ）。
 * ここでは「immersive-vr が使えないとき」だけ forceInstall で入れる（@react-three/xr 側の emulate は切ってある）
 */

const EMULATOR_HOSTNAMES = ['localhost', '127.0.0.1']

/** このページでエミュレーターを入れられるか（ヘッドセットが無いときに使う） */
export function canUseDevXREmulator(): boolean {
  return typeof window !== 'undefined' && EMULATOR_HOSTNAMES.includes(window.location.hostname)
}

let injecting: Promise<boolean> | null = null

async function inject(): Promise<boolean> {
  if (!canUseDevXREmulator() || typeof navigator === 'undefined') return false
  const supported = await navigator.xr?.isSessionSupported('immersive-vr').catch(() => false)
  if (supported) return false
  const [{ XRDevice, metaQuest3 }, { DevUI }] = await Promise.all([
    import('iwer'),
    import('@iwer/devui'),
  ])
  const device = new XRDevice(metaQuest3)
  device.installRuntime({ forceInstall: true })
  device.installDevUI(DevUI)
  return true
}

/**
 * エミュレーターを入れる（ページで1回だけ）。入れたら true。
 * ページを開いただけで navigator.xr を差し替えないよう、「VR に入る」を押したときに呼ぶ
 */
export function injectDevXREmulator(): Promise<boolean> {
  injecting ??= inject().catch((error: unknown) => {
    console.error('[DevEnvironment] VR のエミュレーターを入れられませんでした', error)
    return false
  })
  return injecting
}
