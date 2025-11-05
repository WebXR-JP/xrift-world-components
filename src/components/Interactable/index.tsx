import { Outlines } from '@react-three/drei'
import { Children, cloneElement, isValidElement, useEffect, useRef, type FC } from 'react'
import type { Group } from 'three'
import { useXRift } from '../../contexts/XRiftContext'
import type { Props } from './types'

const INTERACTABLE_LAYER = 10

export const Interactable: FC<Props> = ({
  id,
  type = 'button',
  onInteract,
  interactionText,
  enabled = true,
  children,
}) => {
  const { currentTarget } = useXRift()
  const groupRef = useRef<Group>(null)

  // userDataにインタラクション情報を設定 & レイヤー設定
  useEffect(() => {
    const object = groupRef.current
    if (!object) return

    // userDataにインタラクション情報を設定
    const interactableData = {
      id,
      type,
      onInteract,
      interactionText,
      enabled,
    }

    Object.assign(object.userData, interactableData)

    // レイヤーを設定（レイキャスト最適化のため）
    object.traverse((child) => {
      child.layers.enable(INTERACTABLE_LAYER)
    })

    // クリーンアップ: userDataからインタラクション情報を削除
    return () => {
      if (object.userData) {
        delete object.userData.id
        delete object.userData.type
        delete object.userData.onInteract
        delete object.userData.interactionText
        delete object.userData.enabled
      }

      // レイヤーを無効化
      object.traverse((child) => {
        child.layers.disable(INTERACTABLE_LAYER)
      })
    }
  }, [id, type, onInteract, interactionText, enabled])

  // 現在のターゲットかどうかで視覚的フィードバックを提供
  const isTargeted = currentTarget !== null && currentTarget.uuid === groupRef.current?.uuid

  // 子要素（mesh）に<Outlines>を追加
  const childrenWithOutlines = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    // meshの子要素として<Outlines>を追加
    return cloneElement(child, {
      children: (
        <>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(child.props as any).children}
          {isTargeted && enabled && (
            <Outlines
              thickness={5}
              color="#4dabf7"
              screenspace={false}
              opacity={1}
              transparent={false}
              angle={Math.PI}
            />
          )}
        </>
      ),
    } as never)
  })

  return (
    <group ref={groupRef}>
      {childrenWithOutlines}
    </group>
  )
}

export type { Props as InteractableProps } from './types'
