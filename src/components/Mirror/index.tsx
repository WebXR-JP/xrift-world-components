import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Camera, PerspectiveCamera } from 'three'
import { Color, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { LAYERS } from '../../constants/layers'
import { DEFAULT_LOD_DISTANCE, DEFAULT_REFLECTION_INTERVAL, LOD_HYSTERESIS_RATIO } from './constants'
import { MirrorProps } from './types'
import { shouldUpdateReflection, shouldUseReflector } from './utils'

export type { MirrorProps } from './types'

const _worldPos = new Vector3()
const _cameraWorldPos = new Vector3()

const fallbackVertexShader = `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fallbackFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 edgeColor;
  uniform float fresnelPower;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vWorldNormal), 0.0), fresnelPower);
    vec3 color = mix(baseColor, edgeColor, fresnel);
    gl_FragColor = vec4(color, 1.0);
  }
`

export function Mirror({
  position = [0, 2.5, -9],
  rotation = [0, 0, 0],
  size = [8, 5],
  color = 0xcccccc,
  textureResolution = 512,
  lodDistance = DEFAULT_LOD_DISTANCE,
  reflectionInterval = DEFAULT_REFLECTION_INTERVAL,
}: MirrorProps) {
  const groupRef = useRef<Group>(null)
  const reflectorRef = useRef<Reflector | null>(null)
  const fallbackRef = useRef<Mesh | null>(null)
  const usingReflectorRef = useRef(true)
  const gl = useThree((s) => s.gl)

  // reflectionInterval の最新値を保持（onBeforeRender ゲート内で参照）
  const intervalRef = useRef(reflectionInterval)
  intervalRef.current = reflectionInterval
  // 1フレームに1だけ進む自前カウンタ。onBeforeRender の更新判定に使う
  const frameRef = useRef(0)

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

    // 反射テクスチャの更新間隔ゲート。更新しないフレームは前回のテクスチャが
    // そのまま残るため、見た目はほぼ変わらず描画コストだけが約 1/interval になる。
    // renderer.info.render.frame は Reflector 内部の再帰 render() で余分に進むため
    // 使わず、useFrame で進める自前カウンタ（frameRef）で判定する。
    const originalOnBeforeRender = reflector.onBeforeRender.bind(reflector)
    reflector.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      if (!shouldUpdateReflection(frameRef.current, intervalRef.current)) return
      originalOnBeforeRender(renderer, scene, camera, geometry, material, group)
    }

    // Fallback mesh: Fresnel シェーダーによる擬似ミラー
    const fallbackGeometry = new PlaneGeometry(size[0], size[1])
    const fallbackMaterial = new ShaderMaterial({
      vertexShader: fallbackVertexShader,
      fragmentShader: fallbackFragmentShader,
      uniforms: {
        baseColor: { value: new Color(color) },
        edgeColor: { value: new Color(0xffffff) },
        fresnelPower: { value: 3.0 },
      },
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
  }, [size[0], size[1], color, textureResolution, gl])

  // Reflectorのリフレクションカメラの全レイヤーを有効化
  // VRMFirstPersonのレイヤー設定により、メインカメラではThirdPersonOnlyレイヤー（頭部）が
  // 非表示になっているが、鏡には全身を映す必要があるため
  useFrame(({ camera, gl }) => {
    frameRef.current += 1

    const reflector = reflectorRef.current
    if (!reflector) return

    // VR モードでは XR カメラを使用
    const activeCamera = gl.xr.isPresenting ? gl.xr.getCamera() : camera

    // LOD: カメラと鏡の距離に応じて Reflector ↔ envMap を切り替え
    const fallback = fallbackRef.current
    if (fallback && groupRef.current) {
      _cameraWorldPos.setFromMatrixPosition(activeCamera.matrixWorld)
      const distance = _cameraWorldPos.distanceTo(
        groupRef.current.getWorldPosition(_worldPos),
      )
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

    // three r184+ ではリフレクション用カメラがメインカメラごとの clone に変わり、
    // getReflectionCamera(camera) で取得する。clone はメインカメラのレイヤー設定
    // （一人称 = FIRST_PERSON_ONLY 有効・THIRD_PERSON_ONLY 無効）を継承する。
    // 鏡は三人称視点なので、FIRST_PERSON_ONLY を無効化し THIRD_PERSON_ONLY を
    // 有効化する。enableAll() にすると頭部なし身体コピー（9層）と全身（10層）の
    // 両方が映り、アバターが二重にブレて見えるため使ってはいけない。
    // 型定義にないため any 相当でキャストしてアクセスする。
    const reflectorApi = reflector as unknown as {
      camera?: PerspectiveCamera
      getReflectionCamera?: (camera: Camera) => Camera
    }
    const applyThirdPersonLayers = (target: Camera): void => {
      target.layers.disable(LAYERS.FIRST_PERSON_ONLY)
      target.layers.enable(LAYERS.THIRD_PERSON_ONLY)
    }
    if (typeof reflectorApi.getReflectionCamera === 'function') {
      if (gl.xr.isPresenting) {
        // VR ではシーンが左右の目のサブカメラ（cameraL/cameraR）で個別に描画され、
        // Reflector の onBeforeRender にもサブカメラが渡るため、WeakMap もサブカメラを
        // キーに clone を保持する。ArrayCamera 本体（getCamera()）をキーにすると描画に
        // 使われない clone を触るだけになるので、サブカメラごとに設定する。
        for (const eyeCamera of gl.xr.getCamera().cameras) {
          applyThirdPersonLayers(reflectorApi.getReflectionCamera(eyeCamera))
        }
      } else {
        applyThirdPersonLayers(reflectorApi.getReflectionCamera(camera))
      }
    } else if (reflectorApi.camera) {
      // three r183 以前: 単一の内部カメラ
      applyThirdPersonLayers(reflectorApi.camera)
    }
  })

  return <group ref={groupRef} position={position} rotation={rotation} />
}
