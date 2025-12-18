import { useEffect, useRef, type FC } from 'react'
import type { Group } from 'three'
import { useXRift } from '../../contexts/XRiftContext'
import type { Props } from './types'

// Note: Layer 10 は VRMFirstPerson の THIRD_PERSON_ONLY で使用されているため、Layer 11 を使用
const INTERACTABLE_LAYER = 11

export const Interactable: FC<Props> = ({
  id,
  type = 'button',
  onInteract,
  interactionText,
  enabled = true,
  children,
}) => {
  const { registerInteractable, unregisterInteractable } = useXRift()
  const groupRef = useRef<Group>(null)

  // レイヤー設定 & オブジェクト登録（マウント時のみ）
  useEffect(() => {
    const object = groupRef.current
    if (!object) return

    // レイヤーを設定（レイキャスト最適化のため）
    object.traverse((child) => {
      child.layers.enable(INTERACTABLE_LAYER)
    })

    // インタラクト可能オブジェクトとして登録
    registerInteractable(object)

    // クリーンアップ
    return () => {
      unregisterInteractable(object)

      object.traverse((child) => {
        child.layers.disable(INTERACTABLE_LAYER)
      })
    }
  }, [registerInteractable, unregisterInteractable])

  // userData の更新（props が変わった時）
  useEffect(() => {
    const object = groupRef.current
    if (!object) return

    Object.assign(object.userData, {
      id,
      type,
      onInteract,
      interactionText,
      enabled,
    })
  }, [id, type, onInteract, interactionText, enabled])

  return (
    <group ref={groupRef}>
      {children}
    </group>
  )
}

export type { Props as InteractableProps } from './types'
