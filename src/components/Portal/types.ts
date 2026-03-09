import type { Vector3Tuple } from 'three'

export interface Props {
  instanceId: string
  position?: Vector3Tuple
  rotation?: Vector3Tuple
  /** true の場合、ポータルによる遷移を無効化する */
  disabled?: boolean
}

export interface PortalUniforms {
  uTime: { value: number }
  uColor: { value: [number, number, number] }
  uSecondaryColor: { value: [number, number, number] }
  uIntensity: { value: number }
}
