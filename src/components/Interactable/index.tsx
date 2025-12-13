import { Outlines } from '@react-three/drei'
import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, type FC } from 'react'
import type { Group } from 'three'
import { useCurrentTarget, useXRift } from '../../contexts/XRiftContext'
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
  const { registerInteractable, unregisterInteractable } = useXRift()
  // currentTargetは別のContextから取得（パフォーマンス最適化）
  const currentTarget = useCurrentTarget()
  const groupRef = useRef<Group>(null)

  // userDataにインタラクション情報を設定 & レイヤー設定 & オブジェクト登録
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

    // インタラクト可能オブジェクトとして登録
    registerInteractable(object)

    // クリーンアップ: userDataからインタラクション情報を削除
    return () => {
      // 登録解除
      unregisterInteractable(object)

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
  }, [id, type, onInteract, interactionText, enabled, registerInteractable, unregisterInteractable])

  // 現在のターゲットかどうかで視覚的フィードバックを提供
  const isTargeted = currentTarget !== null && currentTarget.uuid === groupRef.current?.uuid

  // 再帰的に子要素を探索して、すべての<mesh>に<Outlines>を追加する関数
  // isTargetedがfalseの場合は元のchildrenをそのまま返す（パフォーマンス最適化）
  const childrenWithOutlines = useMemo(() => {
    // ターゲットでない場合、または無効の場合は重いcloneElement処理をスキップ
    if (!isTargeted || !enabled) {
      return children
    }

    const addOutlinesToMeshes = (child: React.ReactNode): React.ReactNode => {
      if (!isValidElement(child)) return child

      // 子要素のtypeをチェック（meshかどうか）
      const childType = child.type
      const isMesh = typeof childType === 'string' && childType === 'mesh'

      // meshの場合、Outlinesを子要素として追加
      if (isMesh) {
        return cloneElement(child, {
          children: (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(child.props as any).children}
              <Outlines
                thickness={5}
                color="#4dabf7"
                screenspace={false}
                opacity={1}
                transparent={false}
                angle={Math.PI}
              />
            </>
          ),
        } as never)
      }

      // mesh以外の場合、子要素を再帰的に処理
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grandChildren = (child.props as any).children
      if (grandChildren) {
        return cloneElement(child, {
          children: Children.map(grandChildren, (grandChild) =>
            addOutlinesToMeshes(grandChild)
          ),
        } as never)
      }

      return child
    }

    return Children.map(children, (child) => addOutlinesToMeshes(child))
  }, [children, isTargeted, enabled])

  return (
    <group ref={groupRef}>
      {childrenWithOutlines}
    </group>
  )
}

export type { Props as InteractableProps } from './types'
