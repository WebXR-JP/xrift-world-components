import type { Material, Mesh, Object3D } from 'three'
import { ShaderMaterial } from 'three'
import { LAYERS } from '../../../../constants/layers'
import { GRAB_GHOST_OPACITY } from './constants'

const PATCHED_KEY = '__grabGhostPatched'

/** ShaderMaterial の fragment shader 末尾に alpha 乗算を注入 */
function patchShaderAlpha(mat: ShaderMaterial): void {
  mat.fragmentShader = mat.fragmentShader.replace(
    /}\s*$/,
    `  gl_FragColor.a *= ${GRAB_GHOST_OPACITY.toFixed(2)};\n}`,
  )
  mat.transparent = true
  mat.depthWrite = false
  mat.needsUpdate = true
}

/** 通常マテリアルに半透明設定を適用 */
function patchStandardAlpha(mat: Material): void {
  mat.transparent = true
  mat.opacity = GRAB_GHOST_OPACITY
  mat.depthWrite = false
}

/**
 * 掴み中ゴースト用の見た目を group 全体に適用する。
 * - GRABBABLE / INTERACTABLE レイヤーを除去してゴースト自身が
 *   レイキャスト対象にならないようにする（子が遅延マウントされるため毎フレーム）
 * - マテリアルを半透明化（初回のみパッチ）
 */
export function applyGrabGhostAppearance(group: Object3D): void {
  group.traverse((obj) => {
    obj.layers.disable(LAYERS.GRABBABLE)
    obj.layers.disable(LAYERS.INTERACTABLE)

    if (!('material' in obj)) return
    const mesh = obj as Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat || mat.userData[PATCHED_KEY]) continue
      mat.userData[PATCHED_KEY] = true
      if (mat instanceof ShaderMaterial) {
        patchShaderAlpha(mat)
      } else {
        patchStandardAlpha(mat)
      }
    }
  })
}
