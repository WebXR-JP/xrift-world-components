import { useEffect, useRef, type FC } from 'react'
import { Outlines } from '@react-three/drei'
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

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        if (!enabled) return
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        if (!enabled) return
        e.stopPropagation()
        document.body.style.cursor = 'auto'
      }}
    >
      {children}
      {enabled && (
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
