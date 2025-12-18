import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { Group, PlaneGeometry } from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { MirrorProps } from './types'

export type { MirrorProps } from './types'

export function Mirror({
  position = [0, 2.5, -9],
  rotation = [0, 0, 0],
  size = [8, 5],
  color = 0xcccccc,
  textureResolution = 512,
}: MirrorProps) {
  const groupRef = useRef<Group>(null)
  const reflectorRef = useRef<Reflector | null>(null)
  const { gl } = useThree()

  useEffect(() => {
    const currentGroup = groupRef.current
    if (!currentGroup) return

    const geometry = new PlaneGeometry(size[0], size[1])

    // sizeの比率に応じてテクスチャサイズを計算
    const maxSize = Math.max(size[0], size[1])
    const textureWidth = Math.round((size[0] / maxSize) * textureResolution)
    const textureHeight = Math.round((size[1] / maxSize) * textureResolution)

    const reflector = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth,
      textureHeight,
      color,
      multisample: 0, // Meta Quest (Android Chrome) でのレンダリング不具合回避のため無効化
    })

    reflector.position.set(0, 0, 0)
    currentGroup.add(reflector)
    reflectorRef.current = reflector

    return () => {
      if (currentGroup && reflector) {
        currentGroup.remove(reflector)
        reflector.dispose?.()
      }
      reflectorRef.current = null
    }
  }, [size, color, textureResolution, gl])

  // Reflectorの内部カメラ（virtualCamera）の全レイヤーを有効化
  // VRMFirstPersonのレイヤー設定により、メインカメラではThirdPersonOnlyレイヤー（頭部）が
  // 非表示になっているが、鏡には全身を映す必要があるため
  // onBeforeRenderでメインカメラの設定がコピーされるため、毎フレーム設定が必要
  useFrame(() => {
    const reflector = reflectorRef.current
    if (!reflector) return

    // Reflectorの内部カメラにアクセス（型定義にないためanyでキャスト）
    const virtualCamera = (reflector as unknown as { camera: PerspectiveCamera }).camera
    if (virtualCamera) {
      virtualCamera.layers.enableAll()
    }
  })

  return <group ref={groupRef} position={position} rotation={rotation} />
}
