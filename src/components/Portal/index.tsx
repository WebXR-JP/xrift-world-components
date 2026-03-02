import { Text } from '@react-three/drei'
import { useInstance } from '../../hooks/useInstance'
import { PortalGlow } from './components/PortalGlow'
import { PortalParticles } from './components/PortalParticles'
import { PortalPedestal } from './components/PortalPedestal'
import { PortalThumbnail } from './components/PortalThumbnail'
import { PortalVortex } from './components/PortalVortex'
import { PORTAL_DEFAULTS } from './constants'
import { usePortalProps } from './hooks'
import type { Props } from './types'

export type { Props as PortalProps } from './types'

const PARTICLE_COUNT = 30

/** サムネイル上部からのラベル位置を計算 */
const portalRadius = PORTAL_DEFAULTS.portalRadius
const thumbnailBaseY = portalRadius * 0.15 + 0.15 + portalRadius * 0.7
const thumbnailHalfSize = portalRadius * (2 / 3)
const LABEL_BASE_Y = thumbnailBaseY + thumbnailHalfSize

export const Portal = (props: Props) => {
  const {
    instanceId,
    position,
    rotation,
  } = usePortalProps(props)

  const { info, navigateWithConfirm } = useInstance(instanceId)

  return (
    <group position={position} rotation={rotation}>
      <PortalVortex
        color={PORTAL_DEFAULTS.color}
        secondaryColor={PORTAL_DEFAULTS.secondaryColor}
        intensity={PORTAL_DEFAULTS.intensity}
        rotationSpeed={PORTAL_DEFAULTS.rotationSpeed}
        portalRadius={PORTAL_DEFAULTS.portalRadius}
      />
      <PortalThumbnail
        thumbnailUrl={info?.world.thumbnailUrl ?? undefined}
        portalRadius={PORTAL_DEFAULTS.portalRadius}
      />
      <PortalGlow
        color={PORTAL_DEFAULTS.secondaryColor}
        intensity={PORTAL_DEFAULTS.intensity}
      />
      <PortalParticles
        particleCount={PARTICLE_COUNT}
        color={PORTAL_DEFAULTS.secondaryColor}
        portalRadius={PORTAL_DEFAULTS.portalRadius}
        rotationSpeed={PORTAL_DEFAULTS.rotationSpeed}
      />
      <PortalPedestal onEnter={navigateWithConfirm} />

      {/* ワールド名 */}
      {info && (
        <>
          <Text
            position={[0, LABEL_BASE_Y + 0.3, 0]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="bottom"
            maxWidth={1.6}
          >
            {info.world.name}
          </Text>
          {/* インスタンス名 */}
          <Text
            position={[0, LABEL_BASE_Y + 0.17, 0]}
            fontSize={0.07}
            color="#cccccc"
            anchorX="center"
            anchorY="bottom"
            maxWidth={1.6}
          >
            {info.name}
          </Text>
        </>
      )}
    </group>
  )
}
