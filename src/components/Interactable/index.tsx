import { useEffect, useRef, useState, type FC } from 'react'
import { Outlines } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group, Object3D } from 'three'
import { useXRift } from '../../contexts/XRiftContext'
import type { Props } from './types'

const INTERACTABLE_LAYER = 10

export const Interactable: FC<Props> = ({
  id,
  onInteract,
  interactionText = 'クリックする',
  enabled = true,
  children,
}) => {
  const { registerInteractable, unregisterInteractable } = useXRift()
  const groupRef = useRef<Group>(null)
  const [isHovered, setIsHovered] = useState(false)

  // インタラクタブルオブジェクトとして登録
  useEffect(() => {
    if (!enabled) return

    registerInteractable({
      id,
      type: 'button',
      interactionText,
      onInteract: () => onInteract(id),
    })

    return () => {
      unregisterInteractable(id)
    }
  }, [id, enabled, interactionText, onInteract, registerInteractable, unregisterInteractable])

  // レイヤーを設定
  useEffect(() => {
    if (!groupRef.current || !enabled) return

    groupRef.current.traverse((object: Object3D) => {
      if ('layers' in object) {
        object.layers.enable(INTERACTABLE_LAYER)
      }
    })
  }, [enabled])

  // ホバー状態の管理
  useFrame(() => {
    // ここでは単純化のため、XRiftContext経由でホバー状態を取得する想定
    // 実際の実装はxrift-frontend側のRaycastDetectorが担当
  })

  return (
    <group ref={groupRef}>
      {children}
      {enabled && isHovered && (
        <Outlines
          thickness={0.05}
          color="yellow"
          transparent
          opacity={0.8}
        />
      )}
    </group>
  )
}

export type { Props as InteractableProps } from './types'
