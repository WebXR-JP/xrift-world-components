import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { PerspectiveCamera } from 'three'
import { Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { DEFAULT_LOD_DISTANCE, LOD_HYSTERESIS_RATIO } from './constants'
import { MirrorProps } from './types'
import { shouldUseReflector } from './utils'

export type { MirrorProps } from './types'

const _worldPos = new Vector3()

export function Mirror({
  position = [0, 2.5, -9],
  rotation = [0, 0, 0],
  size = [8, 5],
  color = 0xcccccc,
  textureResolution = 512,
  lodDistance = DEFAULT_LOD_DISTANCE,
}: MirrorProps) {
  const groupRef = useRef<Group>(null)
  const reflectorRef = useRef<Reflector | null>(null)
  const fallbackRef = useRef<Mesh | null>(null)
  const usingReflectorRef = useRef(true)
  const { gl, scene } = useThree()

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

    // Fallback mesh: envMap ベースの擬似ミラー
    const fallbackGeometry = new PlaneGeometry(size[0], size[1])
    const fallbackMaterial = new MeshStandardMaterial({
      metalness: 1,
      roughness: 0,
      envMap: scene.environment,
    })
    const fallbackMesh = new Mesh(fallbackGeometry, fallbackMaterial)
    fallbackMesh.visible = false
    currentGroup.add(fallbackMesh)
    fallbackRef.current = fallbackMesh

    usingReflectorRef.current = true

    return () => {
      if (currentGroup) {
        currentGroup.remove(reflector)
        currentGroup.remove(fallbackMesh)
        geometry.dispose()
        reflector.dispose?.()
        fallbackGeometry.dispose()
        fallbackMaterial.dispose()
      }
      reflectorRef.current = null
      fallbackRef.current = null
    }
  }, [size[0], size[1], color, textureResolution, gl, scene.environment])

  // Reflectorの内部カメラ（virtualCamera）の全レイヤーを有効化
  // VRMFirstPersonのレイヤー設定により、メインカメラではThirdPersonOnlyレイヤー（頭部）が
  // 非表示になっているが、鏡には全身を映す必要があるため
  // onBeforeRenderでメインカメラの設定がコピーされるため、毎フレーム設定が必要
  useFrame(({ camera }) => {
    const reflector = reflectorRef.current
    if (!reflector) return

    // LOD: カメラと鏡の距離に応じて Reflector ↔ envMap を切り替え
    const fallback = fallbackRef.current
    if (fallback && groupRef.current) {
      const distance = camera.position.distanceTo(groupRef.current.getWorldPosition(_worldPos))
      const useReflector = shouldUseReflector(
        distance,
        lodDistance,
        usingReflectorRef.current,
        LOD_HYSTERESIS_RATIO,
      )

      if (useReflector !== usingReflectorRef.current) {
        usingReflectorRef.current = useReflector
        reflector.visible = useReflector
        fallback.visible = !useReflector
      }
    }

    if (!reflector.visible) return

    // Reflectorの内部カメラにアクセス（型定義にないためanyでキャスト）
    const virtualCamera = (reflector as unknown as { camera: PerspectiveCamera }).camera
    if (virtualCamera) {
      virtualCamera.layers.enableAll()
    }
  })

  return <group ref={groupRef} position={position} rotation={rotation} />
}
