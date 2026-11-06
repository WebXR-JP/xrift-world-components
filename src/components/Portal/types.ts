import type { Vector3Tuple } from 'three'

interface BaseProps {
  position?: Vector3Tuple
  rotation?: Vector3Tuple
  /** true の場合、ポータルによる遷移を無効化する */
  disabled?: boolean
}

/**
 * 行き先は instanceId か worldId のどちらか一方。
 * 部屋（インスタンス）は空になると消えるので、instanceId は常設の部屋にだけ使う。
 * worldId を指定すると、くぐったときにプラットフォームが入れる部屋を用意する
 */
export type Props = BaseProps &
  ({ instanceId: string; worldId?: undefined } | { worldId: string; instanceId?: undefined })

/** ポータルの行き先（どちらの ID で指定されたか） */
export type PortalTarget = { kind: 'instance'; id: string } | { kind: 'world'; id: string }

/** ポータルに表示する行き先の情報（instance と world の差を吸収したもの） */
export interface PortalInfo {
  kind: PortalTarget['kind']
  worldName: string
  thumbnailUrl: string | null
  /** 部屋名（instance のときだけ） */
  instanceName?: string
  currentUsers?: number
  maxCapacity?: number
}

export interface PortalUniforms {
  uTime: { value: number }
  uColor: { value: [number, number, number] }
  uSecondaryColor: { value: [number, number, number] }
  uIntensity: { value: number }
}
