import type { BufferGeometry, Camera, Object3D, Scene, WebGLRenderer } from 'three'
import {
  Color,
  HalfFloatType,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { MIN_REFLECTION_TEXTURE_SIZE } from './constants'
import {
  applyThirdPersonLayers,
  fitReflectionCamera,
  getMirrorScreenSize,
  getReflectionTextureSize,
  getVisibleMirrorRect,
  type MirrorRect,
  type ScreenSize,
} from './utils'

interface MirrorReflectorOptions {
  /** 鏡面の幅（ローカル座標） */
  width: number
  /** 鏡面の高さ（ローカル座標） */
  height: number
  textureWidth: number
  textureHeight: number
  color: number
}

/**
 * 反射を描くカメラ。投影行列は fitReflectionCamera が毎回じかに書き込むので、
 * レンダラーなどが updateProjectionMatrix() を呼んでも fov から作り直させない
 */
class ReflectionCamera extends PerspectiveCamera {
  override updateProjectionMatrix(): void {}
}

/**
 * いずれかの鏡が反射を描いている最中か。
 * 反射の中に映る他の鏡は反射を描かない（鏡どうしが互いを映して、描く回数が枚数以上に
 * 増えるのを防ぐ）
 */
let isRenderingReflection = false

/** いま存在する鏡面。反射を描く間、他の鏡を代わりの見た目に切り替えるために持つ */
const liveReflectors = new Set<MirrorReflector>()
const _swapped: MirrorReflector[] = []

const _rect: MirrorRect = { minX: 0, maxX: 0, minY: 0, maxY: 0 }
const _screenSize: ScreenSize = { width: 0, height: 0 }
const _viewport = new Vector4()

const vertexShader = /* glsl */ `
  // 絵が写している範囲（鏡面の UV での左下 xy と大きさ zw）
  uniform vec4 uvRect;
  varying vec2 vUv;

  #include <common>
  #include <logdepthbuf_pars_vertex>

  void main() {
    // 反射カメラは鏡を裏から見るので、絵は左右が逆になっている
    vec2 rectUv = (uv - uvRect.xy) / uvRect.zw;
    vUv = vec2(1.0 - rectUv.x, rectUv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    #include <logdepthbuf_vertex>
  }
`

// 色の乗せ方は three の Reflector と同じ（overlay 合成）
const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  // テクスチャのうち絵を描いた範囲（左下から。xy: 大きさ、zw: 読んでよい上限）
  uniform vec4 uvDrawn;
  varying vec2 vUv;

  #include <logdepthbuf_pars_fragment>

  float blendOverlay(float base, float blend) {
    return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
  }

  vec3 blendOverlay(vec3 base, vec3 blend) {
    return vec3(blendOverlay(base.r, blend.r), blendOverlay(base.g, blend.g), blendOverlay(base.b, blend.b));
  }

  void main() {
    #include <logdepthbuf_fragment>

    // 上限で止めて、描いた範囲の外（前に描いた絵が残っている）をにじませない
    vec4 base = texture2D(tDiffuse, min(vUv * uvDrawn.xy, uvDrawn.zw));
    gl_FragColor = vec4(blendOverlay(base.rgb, color), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/**
 * 鏡面。three の Reflector と違い、反射カメラの視錐台を鏡の枠に合わせる。
 *
 * Reflector は見ているカメラの画角まるごとを反射として描き、鏡に映る部分だけを使う。
 * こちらは鏡の枠のうち画面に見えている範囲だけを描くので、その外の物はカリングされ、
 * テクスチャの画素もすべて画面に見えている鏡面に使われる。
 *
 * 鏡面は PlaneGeometry（ローカルの XY 平面・+Z が表）であること。
 */
export class MirrorReflector extends Mesh<BufferGeometry, ShaderMaterial> {
  private readonly renderTarget: WebGLRenderTarget
  private readonly reflectionCamera = new ReflectionCamera()

  /**
   * 他の鏡の反射の中に映るとき、この鏡面の代わりに見せるもの（同じ位置に置いた擬似ミラー）。
   * 反射は描かないので、鏡面のままだと前に描いた絵（画面に入ったことが無ければ何も無い絵）が
   * 出てしまう
   */
  nestedFallback: Object3D | null = null

  constructor(geometry: BufferGeometry, options: MirrorReflectorOptions) {
    const renderTarget = new WebGLRenderTarget(options.textureWidth, options.textureHeight, {
      samples: 0, // Meta Quest (Android Chrome) でのレンダリング不具合回避のため MSAA は無効
      type: HalfFloatType,
    })
    const material = new ShaderMaterial({
      name: 'MirrorReflectorShader',
      uniforms: {
        color: { value: new Color(options.color) },
        tDiffuse: { value: renderTarget.texture },
        uvRect: { value: new Vector4(0, 0, 1, 1) },
        uvDrawn: { value: new Vector4(1, 1, 1, 1) },
      },
      vertexShader,
      fragmentShader,
    })
    super(geometry, material)
    this.renderTarget = renderTarget
    liveReflectors.add(this)

    const { width, height, textureWidth, textureHeight } = options
    // 絵はテクスチャの左下の一部にだけ描く（大きさは毎回変わる）
    renderTarget.scissorTest = true
    const reflectionCamera = this.reflectionCamera

    this.onBeforeRender = (renderer: WebGLRenderer, scene: Scene, camera: Camera) => {
      if (isRenderingReflection) return
      // 鏡のうち画面に見えている範囲だけを描く（近づいて一部しか見えないときに粗くしない）
      getVisibleMirrorRect(_rect, camera, this.matrixWorld, width, height)
      // 裏から見ているときは描かない
      if (!fitReflectionCamera(reflectionCamera, camera, this.matrixWorld, _rect)) return
      // VR では目ごとに範囲が違うので、描く直前に毎回書き込む
      material.uniforms.uvRect.value.set(
        _rect.minX / width + 0.5,
        _rect.minY / height + 0.5,
        (_rect.maxX - _rect.minX) / width,
        (_rect.maxY - _rect.minY) / height,
      )

      // 鏡が画面上で小さく見えているときは、その大きさまで絵を小さくする。
      // テクスチャは作り直さず、左下の一部にだけ描く
      renderer.getCurrentViewport(_viewport)
      const screenSize = getMirrorScreenSize(
        _screenSize,
        camera,
        this.matrixWorld,
        _rect,
        _viewport.z,
        _viewport.w,
      )
      const drawWidth = screenSize
        ? getReflectionTextureSize(screenSize.width, textureWidth, MIN_REFLECTION_TEXTURE_SIZE)
        : textureWidth
      const drawHeight = screenSize
        ? getReflectionTextureSize(screenSize.height, textureHeight, MIN_REFLECTION_TEXTURE_SIZE)
        : textureHeight
      renderTarget.viewport.set(0, 0, drawWidth, drawHeight)
      renderTarget.scissor.set(0, 0, drawWidth, drawHeight)
      material.uniforms.uvDrawn.value.set(
        drawWidth / textureWidth,
        drawHeight / textureHeight,
        (drawWidth - 0.5) / textureWidth,
        (drawHeight - 0.5) / textureHeight,
      )
      material.uniformsNeedUpdate = true

      // 見ているカメラのレイヤーを引き継ぎ、三人称視点の構成にする（理由は utils.ts）。
      // VR では左右の目のサブカメラが渡ってくるので、目ごとに設定される
      reflectionCamera.layers.mask = camera.layers.mask
      applyThirdPersonLayers(reflectionCamera.layers)

      this.visible = false
      isRenderingReflection = true
      for (const other of liveReflectors) {
        if (other === this || !other.visible || !other.nestedFallback) continue
        other.visible = false
        other.nestedFallback.visible = true
        _swapped.push(other)
      }

      const currentRenderTarget = renderer.getRenderTarget()
      const currentXrEnabled = renderer.xr.enabled
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

      renderer.xr.enabled = false // XR のカメラに差し替えられないようにする
      renderer.shadowMap.autoUpdate = false // 影を描き直さない

      renderer.setRenderTarget(this.renderTarget)
      // 深度バッファを確実に消せるよう、書き込みを有効にしておく（three #18897）
      renderer.state.buffers.depth.setMask(true)
      if (renderer.autoClear === false) renderer.clear()
      renderer.render(scene, reflectionCamera)

      renderer.xr.enabled = currentXrEnabled
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate
      renderer.setRenderTarget(currentRenderTarget)

      // VR のサブカメラは自分のビューポートを持つので戻す
      const viewport = (camera as Camera & { viewport?: Vector4 }).viewport
      if (viewport !== undefined) renderer.state.viewport(viewport)

      for (const other of _swapped) {
        other.visible = true
        if (other.nestedFallback) other.nestedFallback.visible = false
      }
      _swapped.length = 0
      isRenderingReflection = false
      this.visible = true
    }
  }

  dispose(): void {
    liveReflectors.delete(this)
    this.renderTarget.dispose()
    this.material.dispose()
  }
}
