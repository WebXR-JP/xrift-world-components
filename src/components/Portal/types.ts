import type { Vector3Tuple } from 'three'

export interface Props {
  instanceId: string
  position?: Vector3Tuple
  rotation?: Vector3Tuple
}

export interface PortalUniforms {
  uTime: { value: number }
  uColor: { value: [number, number, number] }
  uSecondaryColor: { value: [number, number, number] }
  uIntensity: { value: number }
}
