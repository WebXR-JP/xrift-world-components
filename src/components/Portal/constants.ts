import type { Vector3Tuple } from 'three'

export const PORTAL_DEFAULTS = {
  position: [0, 0, 0] as Vector3Tuple,
  rotation: [0, 0, 0] as Vector3Tuple,
  color: '#9955ff',
  secondaryColor: '#bb88ff',
  intensity: 1.5,
  rotationSpeed: 0.5,
  portalRadius: 0.9,
} as const
