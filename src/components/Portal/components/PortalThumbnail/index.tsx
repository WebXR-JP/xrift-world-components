import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { DataTexture, type Group, type PlaneGeometry, type ShaderMaterial, Texture, TextureLoader } from 'three'
import { simplexNoise3D } from '../../shaders/noise'

interface Props {
  thumbnailUrl?: string
  portalRadius: number
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  ${simplexNoise3D}

  uniform sampler2D uTexture;
  uniform vec3 uGlowColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float angle = atan(center.y, center.x);

    // ノイズで縁をグネグネさせる（0.42基準で余白を確保）
    float noise = snoise(vec3(cos(angle) * 1.0, sin(angle) * 1.0, uTime * 0.5)) * 0.04;
    float edge = 0.42 + noise;

    // 外側グロー領域（縁の外にはみ出す光）
    float glowWidth = 0.06;
    if (dist > edge + glowWidth) discard;

    if (dist > edge) {
      // 縁の外側: 紫グローのみ
      float outerGlow = 1.0 - smoothstep(edge, edge + glowWidth, dist);
      gl_FragColor = vec4(uGlowColor, outerGlow * 0.6);
      return;
    }

    // UVを円の範囲に合わせてスケーリング
    float scale = 0.42 / 0.5;
    vec2 scaledUv = (vUv - 0.5) / scale + 0.5;
    vec4 texColor = texture2D(uTexture, scaledUv);

    // 縁に近いほどグローを強くする
    float edgeStart = edge - 0.12;
    float glowStrength = smoothstep(edgeStart, edge, dist);
    vec3 color = mix(texColor.rgb, uGlowColor, glowStrength * 0.7);

    float alpha = texColor.a + glowStrength * 0.5;

    gl_FragColor = vec4(color + uGlowColor * glowStrength * 0.3, alpha);
  }
`

/** サムネイルがない場合の黒プレースホルダー */
const createBlackTexture = (): DataTexture => {
  const data = new Uint8Array([0, 0, 0, 255])
  const tex = new DataTexture(data, 1, 1)
  tex.needsUpdate = true
  return tex
}

const INITIAL_UNIFORMS = {
  uTexture: { value: null as Texture | null },
  uGlowColor: { value: [0.6, 0.33, 1.0] as [number, number, number] },
  uTime: { value: 0 },
}

export const PortalThumbnail = ({ thumbnailUrl, portalRadius }: Props) => {
  const [texture, setTexture] = useState<Texture | null>(null)
  const meshRef = useRef<Group>(null)
  const geometryRef = useRef<PlaneGeometry>(null)
  const materialRef = useRef<ShaderMaterial>(null)

  useEffect(() => {
    if (!thumbnailUrl) {
      const black = createBlackTexture()
      setTexture(black)
      return () => {
        black.dispose()
        setTexture(null)
      }
    }

    const loader = new TextureLoader()
    loader.setCrossOrigin('anonymous')

    let cancelled = false
    loader.load(
      thumbnailUrl,
      (loaded) => {
        if (cancelled) return
        setTexture(loaded)
      },
      undefined,
      (err) => {
        console.error('PortalThumbnail: texture load failed', err)
        if (!cancelled) {
          const black = createBlackTexture()
          setTexture(black)
        }
      },
    )

    return () => {
      cancelled = true
      setTexture((prev) => {
        prev?.dispose()
        return null
      })
    }
  }, [thumbnailUrl])

  useEffect(() => {
    if (!materialRef.current || !texture) return
    materialRef.current.uniforms.uTexture.value = texture
  }, [texture])

  useEffect(() => {
    const geometry = geometryRef.current
    const material = materialRef.current
    return () => {
      geometry?.dispose()
      material?.dispose()
    }
  }, [])

  const baseY = portalRadius * 0.15 + 0.15 + portalRadius * 0.7

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.position.y = baseY + Math.sin(clock.getElapsedTime()) * 0.05
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  const size = portalRadius * (2 / 3) * 2

  if (!texture) return null

  return (
    <group ref={meshRef} position={[0, baseY, 0]}>
      <mesh>
        <planeGeometry ref={geometryRef} args={[size, size]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={INITIAL_UNIFORMS}
          transparent
        />
      </mesh>
    </group>
  )
}
