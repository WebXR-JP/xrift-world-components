import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector2, Vector3 } from 'three'
import {
  LOD_HYSTERESIS_RATIO,
  MIN_REFLECTION_SCREEN_PIXELS,
  SCREEN_SIZE_HYSTERESIS_RATIO,
} from './constants'
import { MirrorProps } from './types'
import { MirrorReflector } from './reflector'
import {
  getMirrorScreenSize,
  type ScreenSize,
  shouldUseReflector,
  shouldUseReflectorBySize,
} from './utils'

export type { MirrorProps } from './types'

const _worldPos = new Vector3()
const _cameraWorldPos = new Vector3()
const _bufferSize = new Vector2()
const _screenSize: ScreenSize = { width: 0, height: 0 }

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
  lodDistance,
}: MirrorProps) {
  const groupRef = useRef<Group>(null)
  const reflectorRef = useRef<MirrorReflector | null>(null)
  const fallbackRef = useRef<Mesh | null>(null)
  const usingReflectorRef = useRef(true)
  // 大きさ・距離それぞれの判定の結果。ヒステリシスの「現在の状態」を判定ごとに持つ
  // （共有すると、片方の理由で擬似ミラーになっているだけで、もう片方まで戻りにくくなる）
  const largeEnoughRef = useRef(true)
  const nearEnoughRef = useRef(true)
  const gl = useThree((s) => s.gl)
  const fullRect = useMemo(
    () => ({ minX: -size[0] / 2, maxX: size[0] / 2, minY: -size[1] / 2, maxY: size[1] / 2 }),
    [size[0], size[1]],
  )

  useEffect(() => {
    const currentGroup = groupRef.current
    if (!currentGroup) return

    const geometry = new PlaneGeometry(size[0], size[1])

    // 描いた絵は鏡面にそのまま貼られるので、テクスチャの縦横比を鏡面に合わせる
    const maxSize = Math.max(size[0], size[1])
    const textureWidth = Math.round((size[0] / maxSize) * textureResolution)
    const textureHeight = Math.round((size[1] / maxSize) * textureResolution)

    const reflector = new MirrorReflector(geometry, {
      width: size[0],
      height: size[1],
      textureWidth,
      textureHeight,
      color,
    })

    reflector.position.set(0, 0, 0)
    currentGroup.add(reflector)
    reflectorRef.current = reflector

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
    // 他の鏡の反射の中では、この擬似ミラーを代わりに映す
    reflector.nestedFallback = fallbackMesh

    usingReflectorRef.current = true
    largeEnoughRef.current = true
    nearEnoughRef.current = true

    return () => {
      if (currentGroup) {
        currentGroup.remove(reflector)
        currentGroup.remove(fallbackMesh)
        geometry.dispose()
        reflector.dispose()
        fallbackGeometry.dispose()
        fallbackMaterial.dispose()
      }
      reflectorRef.current = null
      fallbackRef.current = null
    }
  }, [size[0], size[1], color, textureResolution, gl])

  // 反射 ↔ 擬似ミラーの切り替え。
  // 離れると反射の解像度は MirrorReflector が自動で下げるので、擬似ミラーにするのは
  // 画面上で十分小さくなったときだけ（lodDistance の指定があれば、その距離でも切り替える）。
  // 反射を描くカメラのレイヤー（鏡には頭部込みの全身を映す）も MirrorReflector が設定する
  useFrame(({ camera, gl }) => {
    const reflector = reflectorRef.current
    const fallback = fallbackRef.current
    if (!reflector || !fallback || !groupRef.current) return

    // VR では片目のカメラで測る（描く範囲の大きさも片目ぶん）
    const xrEye = gl.xr.isPresenting ? gl.xr.getCamera().cameras[0] : undefined
    const viewer = xrEye ?? camera
    const viewportWidth = xrEye ? xrEye.viewport.z : gl.getDrawingBufferSize(_bufferSize).x
    const viewportHeight = xrEye ? xrEye.viewport.w : gl.getDrawingBufferSize(_bufferSize).y

    // 置いた直後は、まだ一度も描かれておらず行列が更新されていない
    reflector.updateWorldMatrix(true, false)

    // 鏡の一部がカメラの後ろにあるときは測れない。すぐ近くにいるので反射を描く
    const screenSize = getMirrorScreenSize(
      _screenSize,
      viewer,
      reflector.matrixWorld,
      fullRect,
      viewportWidth,
      viewportHeight,
    )
    const screenPixels = screenSize
      ? Math.max(screenSize.width, screenSize.height)
      : Number.POSITIVE_INFINITY
    largeEnoughRef.current = shouldUseReflectorBySize(
      screenPixels,
      MIN_REFLECTION_SCREEN_PIXELS,
      largeEnoughRef.current,
      SCREEN_SIZE_HYSTERESIS_RATIO,
    )

    if (lodDistance === undefined) {
      nearEnoughRef.current = true
    } else {
      _cameraWorldPos.setFromMatrixPosition(viewer.matrixWorld)
      const distance = _cameraWorldPos.distanceTo(groupRef.current.getWorldPosition(_worldPos))
      nearEnoughRef.current = shouldUseReflector(
        distance,
        lodDistance,
        nearEnoughRef.current,
        LOD_HYSTERESIS_RATIO,
      )
    }

    const useReflector = largeEnoughRef.current && nearEnoughRef.current

    if (useReflector !== usingReflectorRef.current) {
      usingReflectorRef.current = useReflector
      reflector.visible = useReflector
      fallback.visible = !useReflector
    }
  })

  return <group ref={groupRef} position={position} rotation={rotation} />
}
