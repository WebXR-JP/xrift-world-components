import { Text } from '@react-three/drei'
import { useMemo } from 'react'
import { BillboardY } from '../BillboardY'
import { PortalGlow } from './components/PortalGlow'
import { PortalParticles } from './components/PortalParticles'
import { PortalPedestal } from './components/PortalPedestal'
import { PortalThumbnail } from './components/PortalThumbnail'
import { PortalVortex } from './components/PortalVortex'
import { PORTAL_DEFAULTS } from './constants'
import { usePortalProps, usePortalTarget } from './hooks'
import type { Props } from './types'
import { resolvePortalTarget } from './utils'

export type { Props as PortalProps } from './types'

const PARTICLE_COUNT = 30
const NOT_FOUND_LABEL = '行き先が見つかりません'

/** サムネイル上部からのラベル位置を計算 */
const portalRadius = PORTAL_DEFAULTS.portalRadius
const thumbnailBaseY = portalRadius * 0.15 + 0.15 + portalRadius * 0.7
const thumbnailHalfSize = portalRadius * (2 / 3)
const LABEL_BASE_Y = thumbnailBaseY + thumbnailHalfSize

export const Portal = (props: Props) => {
  const {
    instanceId,
    worldId,
    position,
    rotation,
    disabled,
  } = usePortalProps(props)

  const target = useMemo(() => resolvePortalTarget({ instanceId, worldId }), [instanceId, worldId])
  const { info, notFound, navigateWithConfirm } = usePortalTarget(target)
  // 行き先の指定が無ければくぐれない。取れなかっただけなら、くぐったときに取り直す（一時的な失敗からの復帰）
  const canEnter = !disabled && target !== null

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
      <PortalPedestal onEnter={canEnter ? navigateWithConfirm : undefined} />

      {/* 行き先が取れない（指定が無いときもここ。info とは排他） */}
      {notFound && (
        <BillboardY>
          <Text
            position={[0, LABEL_BASE_Y + 0.3, 0]}
            fontSize={0.1}
            color="#ff8888"
            anchorX="center"
            anchorY="bottom"
            maxWidth={1.6}
          >
            {NOT_FOUND_LABEL}
          </Text>
        </BillboardY>
      )}

      {/* ワールド名・部屋名（部屋行きのときだけ 2 行目） */}
      {!notFound && info && (
        <BillboardY>
          <Text
            position={[0, LABEL_BASE_Y + 0.3, 0]}
            fontSize={0.12}
            color="white"
            anchorX="center"
            anchorY="bottom"
            maxWidth={1.6}
          >
            {info.worldName}
          </Text>
          {info.kind === 'instance' && (
            <Text
              position={[0, LABEL_BASE_Y + 0.17, 0]}
              fontSize={0.07}
              color="#cccccc"
              anchorX="center"
              anchorY="bottom"
              maxWidth={1.6}
            >
              {info.instanceName}
            </Text>
          )}
        </BillboardY>
      )}
    </group>
  )
}
