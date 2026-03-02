import { usePortalNavigation } from '../../hooks/usePortalNavigation'
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

export const Portal = (props: Props) => {
  const {
    instanceId,
    position,
    rotation,
  } = usePortalProps(props)

  const { info, enterPortal } = usePortalNavigation(instanceId)

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
        thumbnailUrl={info?.thumbnailUrl ?? undefined}
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
      <PortalPedestal onEnter={enterPortal} />
    </group>
  )
}
