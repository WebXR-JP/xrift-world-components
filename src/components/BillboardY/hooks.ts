import { useEffect, useRef } from 'react'
import {
  BoxGeometry,
  type Camera,
  Euler,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from 'three'
import { getBillboardYRotation } from './utils'

const _cameraWorldPos = new Vector3()
const _targetWorldPos = new Vector3()
const _parentQuat = new Quaternion()
const _parentPos = new Vector3()
const _parentScale = new Vector3()
const _euler = new Euler()

// DEBUG: 原因特定用ログ。PR マージ前に削除する
let __billboardYInstanceCounter = 0
let __billboardYFrameCounter = 0
let __lastFrameLogged = -1

const SENTINEL_GEOMETRY = new BoxGeometry(0.001, 0.001, 0.001)

// Three.js はレンダーリストを opaque → transparent の順で処理する。
// renderOrder はリスト内のソートにのみ影響するため、
// opaque/transparent 両方の子要素に対応するには両方のリストに sentinel が必要。
const OPAQUE_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
})
const TRANSPARENT_MATERIAL = new MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthTest: false,
  transparent: true,
  opacity: 0,
})

/**
 * Y軸ビルボードフック
 * 対象の Object3D を毎フレームカメラに向けてY軸のみ回転させる
 * 親のワールド回転を考慮し、ローカル回転として正しい値を設定する
 *
 * 2つの sentinel メッシュ（pre/post）により、Mirror（Reflector）の
 * ネステッドレンダーと WebXR の両方に対応する。
 * - pre-sentinel (renderOrder=-Infinity): 回転を保存 → カメラ用に設定
 * - post-sentinel (renderOrder=+Infinity): 保存した回転を復元
 * スタック構造で多重ネスト（Mirror + WebXR左右眼）にも対応。
 *
 * WebXR安全性:
 * - setFromMatrixPosition(): matrixWorldを直接読み取り、updateWorldMatrixを呼ばない
 * - decompose(): 同上
 * - target.updateWorldMatrix(false, true): targetとその子のみ更新、カメラには触れない
 */
export const useBillboardY = <T extends Object3D>() => {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return
    const target = ref.current

    // DEBUG: インスタンス識別用カウンタ
    const instanceId = ++__billboardYInstanceCounter

    // 回転の save/restore 用スタック
    const savedRotations: number[] = []

    // DEBUG: 同じカメラインスタンスが繰り返し使われているか識別する
    const seenCameras = new WeakMap<Camera, number>()
    let __camCounter = 0
    const camId = (camera: Camera): number => {
      let id = seenCameras.get(camera)
      if (id === undefined) {
        id = ++__camCounter
        seenCameras.set(camera, id)
      }
      return id
    }

    const applyRotation = (camera: Camera, scene: unknown, label: string) => {
      const before = target.rotation.y
      savedRotations.push(target.rotation.y)

      // WebXR安全: matrixWorldを直接読み取り、updateWorldMatrixを呼ばない
      _cameraWorldPos.setFromMatrixPosition(camera.matrixWorld)
      _targetWorldPos.setFromMatrixPosition(target.matrixWorld)

      const worldRotationY = getBillboardYRotation(
        _cameraWorldPos,
        _targetWorldPos,
      )

      if (target.parent) {
        target.parent.matrixWorld.decompose(
          _parentPos,
          _parentQuat,
          _parentScale,
        )
        _euler.setFromQuaternion(_parentQuat, 'YXZ')
        target.rotation.y = worldRotationY - _euler.y
      } else {
        target.rotation.y = worldRotationY
      }

      target.updateWorldMatrix(false, true)

      // DEBUG: フレーム境界判定 + 発火ログ
      const now = performance.now() | 0
      if (now !== __lastFrameLogged) {
        __billboardYFrameCounter++
        __lastFrameLogged = now
      }
      // matrixWorld の rotation Y 成分を確認（YXZ の場合 m11=cos, m13=sin）
      const m = target.matrixWorld.elements
      const mwRotY = Math.atan2(m[8], m[10])
      // eslint-disable-next-line no-console
      console.log(
        `[BBY#${instanceId} f${__billboardYFrameCounter}] ${label} apply`,
        {
          cam: `${camera.type}#${camId(camera)}`,
          camMask: camera.layers.mask.toString(2),
          sceneId: (scene as { uuid?: string })?.uuid?.slice(0, 8),
          before: +before.toFixed(3),
          after: +target.rotation.y.toFixed(3),
          mwRotY: +mwRotY.toFixed(3),
          stack: savedRotations.length,
        },
      )
    }

    const restoreRotation = (label: string) => {
      const beforePop = target.rotation.y
      const saved = savedRotations.pop()
      if (saved !== undefined) {
        target.rotation.y = saved
        target.updateWorldMatrix(false, true)
      }
      const m = target.matrixWorld.elements
      const mwRotY = Math.atan2(m[8], m[10])
      // eslint-disable-next-line no-console
      console.log(
        `[BBY#${instanceId} f${__billboardYFrameCounter}] ${label} restore`,
        {
          beforePop: +beforePop.toFixed(3),
          after: +target.rotation.y.toFixed(3),
          mwRotY: +mwRotY.toFixed(3),
          stack: savedRotations.length,
          popped: saved !== undefined,
        },
      )
    }

    // opaque リスト用 sentinel
    const opaquePreSentinel = new Mesh(SENTINEL_GEOMETRY, OPAQUE_MATERIAL)
    opaquePreSentinel.frustumCulled = false
    opaquePreSentinel.renderOrder = -Infinity
    opaquePreSentinel.onBeforeRender = (
      _r: unknown,
      scene: unknown,
      camera: Camera,
    ) => applyRotation(camera, scene, 'opaquePre')

    const opaquePostSentinel = new Mesh(SENTINEL_GEOMETRY, OPAQUE_MATERIAL)
    opaquePostSentinel.frustumCulled = false
    opaquePostSentinel.renderOrder = Infinity
    opaquePostSentinel.onBeforeRender = () => restoreRotation('opaquePost')

    // transparent リスト用 sentinel
    const transparentPreSentinel = new Mesh(
      SENTINEL_GEOMETRY,
      TRANSPARENT_MATERIAL,
    )
    transparentPreSentinel.frustumCulled = false
    transparentPreSentinel.renderOrder = -Infinity
    transparentPreSentinel.onBeforeRender = (
      _r: unknown,
      scene: unknown,
      camera: Camera,
    ) => applyRotation(camera, scene, 'transparentPre')

    const transparentPostSentinel = new Mesh(
      SENTINEL_GEOMETRY,
      TRANSPARENT_MATERIAL,
    )
    transparentPostSentinel.frustumCulled = false
    transparentPostSentinel.renderOrder = Infinity
    transparentPostSentinel.onBeforeRender = () =>
      restoreRotation('transparentPost')

    const sentinels = [
      opaquePreSentinel,
      opaquePostSentinel,
      transparentPreSentinel,
      transparentPostSentinel,
    ]
    // どのカメラのレイヤー設定でも projection を通すため全レイヤーを有効化
    // （sentinel は colorWrite/depthWrite 全 off なので描画自体は無害）
    for (const s of sentinels) {
      s.layers.enableAll()
      target.add(s)
    }

    // eslint-disable-next-line no-console
    console.log(`[BBY#${instanceId}] mounted`, {
      targetUuid: target.uuid,
      parentName: target.parent?.name || target.parent?.type,
    })

    return () => {
      for (const s of sentinels) {
        s.onBeforeRender = () => {}
        target.remove(s)
      }
      // eslint-disable-next-line no-console
      console.log(`[BBY#${instanceId}] unmounted`)
    }
  }, [])

  return ref
}
