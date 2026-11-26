import { Euler, Layers, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { LAYERS } from '../../../constants/layers'
import {
  applyThirdPersonLayers,
  fitReflectionCamera,
  getMirrorScreenSize,
  getReflectionTextureSize,
  getVisibleMirrorRect,
  type MirrorRect,
  shouldUseReflector,
  shouldUseReflectorBySize,
} from '../utils'
import { LOD_HYSTERESIS_RATIO } from '../constants'

describe('shouldUseReflector', () => {
  const lodDistance = 10
  const hysteresis = LOD_HYSTERESIS_RATIO // 0.8

  describe('現在 Reflector を使用中', () => {
    it('距離が lodDistance 以下なら true を返す', () => {
      expect(shouldUseReflector(5, lodDistance, true, hysteresis)).toBe(true)
      expect(shouldUseReflector(10, lodDistance, true, hysteresis)).toBe(true)
    })

    it('距離が lodDistance を超えたら false を返す', () => {
      expect(shouldUseReflector(10.1, lodDistance, true, hysteresis)).toBe(false)
      expect(shouldUseReflector(15, lodDistance, true, hysteresis)).toBe(false)
    })
  })

  describe('現在 envMap を使用中', () => {
    it('距離が lodDistance * hysteresis 以下なら true に戻る', () => {
      expect(shouldUseReflector(7, lodDistance, false, hysteresis)).toBe(true)
      expect(shouldUseReflector(8, lodDistance, false, hysteresis)).toBe(true)
    })

    it('ヒステリシス範囲内（8〜10m）では false を維持する', () => {
      expect(shouldUseReflector(8.5, lodDistance, false, hysteresis)).toBe(false)
      expect(shouldUseReflector(9, lodDistance, false, hysteresis)).toBe(false)
      expect(shouldUseReflector(10, lodDistance, false, hysteresis)).toBe(false)
    })

    it('距離が lodDistance を超えていれば false を維持する', () => {
      expect(shouldUseReflector(15, lodDistance, false, hysteresis)).toBe(false)
    })
  })

  describe('境界値', () => {
    it('距離 0 では常に true', () => {
      expect(shouldUseReflector(0, lodDistance, true, hysteresis)).toBe(true)
      expect(shouldUseReflector(0, lodDistance, false, hysteresis)).toBe(true)
    })

    it('lodDistance が 0 の場合は常に false', () => {
      expect(shouldUseReflector(0, 0, true, hysteresis)).toBe(true)
      expect(shouldUseReflector(0.1, 0, true, hysteresis)).toBe(false)
    })
  })
})

describe('applyThirdPersonLayers', () => {
  /** xrift-frontend のメインカメラと同じ一人称の構成（0・9・13 有効、10 無効） */
  const createFirstPersonLayers = (): Layers => {
    const layers = new Layers()
    layers.enable(LAYERS.DEFAULT)
    layers.enable(LAYERS.FIRST_PERSON_ONLY)
    layers.disable(LAYERS.THIRD_PERSON_ONLY)
    layers.enable(13) // UI_OVERLAY（frontend 側で予約）
    return layers
  }

  it('一人称の構成を三人称に切り替える（9層を無効化・10層を有効化）', () => {
    const layers = createFirstPersonLayers()
    applyThirdPersonLayers(layers)
    expect(layers.isEnabled(LAYERS.FIRST_PERSON_ONLY)).toBe(false)
    expect(layers.isEnabled(LAYERS.THIRD_PERSON_ONLY)).toBe(true)
  })

  it('9層・10層以外のレイヤーは継承したまま変えない', () => {
    const layers = createFirstPersonLayers()
    applyThirdPersonLayers(layers)
    expect(layers.isEnabled(LAYERS.DEFAULT)).toBe(true)
    expect(layers.isEnabled(13)).toBe(true)
    expect(layers.isEnabled(LAYERS.INTERACTABLE)).toBe(false)
    expect(layers.isEnabled(LAYERS.GRABBABLE)).toBe(false)
  })

  it('全レイヤーを有効化しない（頭部なしコピーと全身が二重に描画されるのを防ぐ）', () => {
    const layers = createFirstPersonLayers()
    applyThirdPersonLayers(layers)
    const all = new Layers()
    all.enableAll()
    expect(layers.mask).not.toBe(all.mask)
  })

  it('毎フレーム呼んでも結果が変わらない', () => {
    const layers = createFirstPersonLayers()
    applyThirdPersonLayers(layers)
    const once = layers.mask
    applyThirdPersonLayers(layers)
    expect(layers.mask).toBe(once)
  })
})

const fullRect = (width: number, height: number): MirrorRect => ({
  minX: -width / 2,
  maxX: width / 2,
  minY: -height / 2,
  maxY: height / 2,
})

describe('fitReflectionCamera', () => {
  const createViewer = (position: Vector3) => {
    const viewer = new PerspectiveCamera(60, 16 / 9, 0.1, 1000)
    viewer.position.copy(position)
    viewer.updateMatrixWorld()
    return viewer
  }

  it('目を鏡面で折り返した位置に置き、鏡の表を向く', () => {
    const reflectionCamera = new PerspectiveCamera()
    const viewer = createViewer(new Vector3(0.5, 0.3, 2))

    expect(fitReflectionCamera(reflectionCamera, viewer, new Matrix4(), fullRect(4, 2))).toBe(true)

    expect(reflectionCamera.position.x).toBeCloseTo(0.5)
    expect(reflectionCamera.position.y).toBeCloseTo(0.3)
    expect(reflectionCamera.position.z).toBeCloseTo(-2)
    const forward = reflectionCamera.getWorldDirection(new Vector3())
    expect(forward.x).toBeCloseTo(0)
    expect(forward.y).toBeCloseTo(0)
    expect(forward.z).toBeCloseTo(1)
  })

  it('目が鏡の裏にあるときは false を返す', () => {
    const reflectionCamera = new PerspectiveCamera()
    const viewer = createViewer(new Vector3(0, 0, -1))

    expect(fitReflectionCamera(reflectionCamera, viewer, new Matrix4(), fullRect(4, 2))).toBe(false)
  })

  it('鏡の四隅が絵の四隅に来る（左右は逆）。鏡面は near に乗る', () => {
    const reflectionCamera = new PerspectiveCamera()
    const mirrorMatrixWorld = new Matrix4().compose(
      new Vector3(3, 1.5, -4),
      new Quaternion().setFromEuler(new Euler(0.1, 0.8, 0)),
      new Vector3(1.5, 1.5, 1.5),
    )
    // 鏡の正面から外れた位置（鏡のローカルで表側）に目を置く
    const viewer = createViewer(new Vector3(1.2, 0.4, 2.5).applyMatrix4(mirrorMatrixWorld))
    const width = 3
    const height = 2

    expect(fitReflectionCamera(reflectionCamera, viewer, mirrorMatrixWorld, fullRect(width, height))).toBe(true)

    for (const [signX, signY] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const ndc = new Vector3((signX * width) / 2, (signY * height) / 2, 0)
        .applyMatrix4(mirrorMatrixWorld)
        .project(reflectionCamera)
      expect(ndc.x).toBeCloseTo(-signX)
      expect(ndc.y).toBeCloseTo(signY)
      expect(ndc.z).toBeCloseTo(-1)
    }
  })

  it('物は、目から鏡越しに見える鏡面上の位置に描かれる', () => {
    const reflectionCamera = new PerspectiveCamera()
    const viewer = createViewer(new Vector3(0, 0, 2))
    fitReflectionCamera(reflectionCamera, viewer, new Matrix4(), fullRect(4, 2))

    // (1, 0, 1) の物の鏡像は (1, 0, -1)。目 (0, 0, 2) からは鏡面の x = 2/3 に見える。
    // 幅 4 の鏡では中心から右へ 1/3（NDC 換算）。絵は左右が逆なので -1/3
    const ndc = new Vector3(1, 0, 1).project(reflectionCamera)
    expect(ndc.x).toBeCloseTo(-1 / 3)
    expect(ndc.y).toBeCloseTo(0)
  })

  it('目が鏡面にほぼ接していても near が 0 にならない', () => {
    const reflectionCamera = new PerspectiveCamera()
    const viewer = createViewer(new Vector3(0, 0, 0.0001))

    expect(fitReflectionCamera(reflectionCamera, viewer, new Matrix4(), fullRect(4, 2))).toBe(true)
    expect(reflectionCamera.near).toBeCloseTo(0.01)
    expect(reflectionCamera.projectionMatrix.elements.every(Number.isFinite)).toBe(true)
  })
})

describe('getVisibleMirrorRect', () => {
  const emptyRect = (): MirrorRect => ({ minX: 0, maxX: 0, minY: 0, maxY: 0 })
  // 既定では -Z（鏡の表）を向く
  const createViewer = (position: Vector3, rotationY = 0) => {
    const viewer = new PerspectiveCamera(60, 16 / 9, 0.1, 1000)
    viewer.position.copy(position)
    viewer.rotation.y = rotationY
    viewer.updateMatrixWorld()
    return viewer
  }

  it('鏡の全体が画面に入っているときは、鏡の全面を返す', () => {
    const viewer = createViewer(new Vector3(0, 0, 10))
    const rect = getVisibleMirrorRect(emptyRect(), viewer, new Matrix4(), 2, 2)
    expect(rect).toEqual(fullRect(2, 2))
  })

  it('近づいて鏡の一部しか見えないときは、画面に入る範囲（と少しの余白）だけを返す', () => {
    const viewer = createViewer(new Vector3(0, 0, 0.5))
    const rect = getVisibleMirrorRect(emptyRect(), viewer, new Matrix4(), 4, 4)
    // 距離 0.5・縦の画角 60° なので、画面の縦は ±0.5·tan30°、横はその 16/9 倍。余白は辺の 2%
    const halfHeight = 0.5 * Math.tan(Math.PI / 6)
    const halfWidth = halfHeight * (16 / 9)
    expect(rect.maxY).toBeCloseTo(halfHeight * 1.04, 5)
    expect(rect.minY).toBeCloseTo(-halfHeight * 1.04, 5)
    expect(rect.maxX).toBeCloseTo(halfWidth * 1.04, 5)
    expect(rect.minX).toBeCloseTo(-halfWidth * 1.04, 5)
  })

  it('鏡の端を見ているときは、鏡の枠で切り取る', () => {
    const viewer = createViewer(new Vector3(1.9, 0, 0.5))
    const rect = getVisibleMirrorRect(emptyRect(), viewer, new Matrix4(), 4, 4)
    expect(rect.maxX).toBe(2)
    expect(rect.minX).toBeGreaterThan(1)
  })

  it('鏡を真横から見ているときは範囲が閉じないので、鏡の全面を返す', () => {
    const viewer = createViewer(new Vector3(0, 0, 0.5), Math.PI / 2)
    const rect = getVisibleMirrorRect(emptyRect(), viewer, new Matrix4(), 4, 4)
    expect(rect).toEqual(fullRect(4, 4))
  })

  it('目が鏡の裏にあるときは、鏡の全面を返す', () => {
    const viewer = createViewer(new Vector3(0, 0, -1))
    const rect = getVisibleMirrorRect(emptyRect(), viewer, new Matrix4(), 4, 4)
    expect(rect).toEqual(fullRect(4, 4))
  })

  it('鏡が動かしてあっても、鏡面のローカル座標で返す', () => {
    const mirrorMatrixWorld = new Matrix4().compose(
      new Vector3(-3, 1.5, 3),
      new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)),
      new Vector3(1, 1, 1),
    )
    // 鏡の正面 0.5m。鏡は +X を向いているので、目は -X を向く
    const viewer = createViewer(new Vector3(-2.5, 1.5, 3), Math.PI / 2)
    const rect = getVisibleMirrorRect(emptyRect(), viewer, mirrorMatrixWorld, 4, 4)
    const halfHeight = 0.5 * Math.tan(Math.PI / 6)
    expect(rect.maxY).toBeCloseTo(halfHeight * 1.04, 5)
    expect(rect.minX).toBeCloseTo(-halfHeight * (16 / 9) * 1.04, 5)
  })

  it('返した範囲で反射カメラを合わせると、範囲の四隅が絵の四隅に来る', () => {
    const viewer = createViewer(new Vector3(0.3, 0.2, 0.5))
    const rect = getVisibleMirrorRect(emptyRect(), viewer, new Matrix4(), 4, 4)
    const reflectionCamera = new PerspectiveCamera()
    expect(fitReflectionCamera(reflectionCamera, viewer, new Matrix4(), rect)).toBe(true)

    const ndc = new Vector3(rect.maxX, rect.maxY, 0).project(reflectionCamera)
    expect(ndc.x).toBeCloseTo(-1, 5)
    expect(ndc.y).toBeCloseTo(1, 5)
  })
})

describe('shouldUseReflectorBySize', () => {
  it('反射を表示中は、下限以上なら反射のまま', () => {
    expect(shouldUseReflectorBySize(32, 32, true, 1.25)).toBe(true)
    expect(shouldUseReflectorBySize(31.9, 32, true, 1.25)).toBe(false)
  })

  it('擬似ミラーを表示中は、下限より少し大きくなるまで戻さない', () => {
    expect(shouldUseReflectorBySize(35, 32, false, 1.25)).toBe(false)
    expect(shouldUseReflectorBySize(40, 32, false, 1.25)).toBe(true)
  })

  it('大きさを測れないとき（無限大）は反射を描く', () => {
    expect(shouldUseReflectorBySize(Number.POSITIVE_INFINITY, 32, false, 1.25)).toBe(true)
  })
})

describe('getReflectionTextureSize', () => {
  it('画面上の大きさがテクスチャより小さければ、画面上の大きさを刻みに切り上げる', () => {
    expect(getReflectionTextureSize(100.2, 512, 16, 16)).toBe(112)
    expect(getReflectionTextureSize(112, 512, 16, 16)).toBe(112)
  })

  it('少し動いただけでは大きさが変わらない', () => {
    expect(getReflectionTextureSize(101, 512, 16, 16)).toBe(getReflectionTextureSize(110, 512, 16, 16))
  })

  it('テクスチャの大きさを超えない', () => {
    expect(getReflectionTextureSize(2000, 512, 16, 16)).toBe(512)
    expect(getReflectionTextureSize(505, 508, 16, 16)).toBe(508)
  })

  it('下限を下回らない', () => {
    expect(getReflectionTextureSize(2, 512, 16, 16)).toBe(16)
  })

  it('有限でない大きさ（測れない・計算が壊れた）のときは、テクスチャの大きさにする', () => {
    expect(getReflectionTextureSize(Number.POSITIVE_INFINITY, 512, 16, 16)).toBe(512)
    expect(getReflectionTextureSize(Number.NaN, 512, 16, 16)).toBe(512)
  })
})

describe('getMirrorScreenSize', () => {
  const createViewer = (position: Vector3, rotationY = 0) => {
    const viewer = new PerspectiveCamera(60, 16 / 9, 0.1, 1000)
    viewer.position.copy(position)
    viewer.rotation.y = rotationY
    viewer.updateMatrixWorld()
    return viewer
  }
  const out = () => ({ width: 0, height: 0 })
  // 縦の画角 60°・高さ 720px の画面で、距離 1m にある 1m の長さ[px]
  const pixelsPerMeterAt1m = 720 / 2 / Math.tan(Math.PI / 6)

  it('正面から見た鏡は、距離に反比例した大きさになる', () => {
    const viewer = createViewer(new Vector3(0, 0, 10))
    const size = getMirrorScreenSize(out(), viewer, new Matrix4(), fullRect(3, 2), 1280, 720)
    expect(size?.width).toBeCloseTo((3 * pixelsPerMeterAt1m) / 10, 3)
    expect(size?.height).toBeCloseTo((2 * pixelsPerMeterAt1m) / 10, 3)
  })

  it('離れるほど小さくなる', () => {
    const near = getMirrorScreenSize(
      out(),
      createViewer(new Vector3(0, 0, 5)),
      new Matrix4(),
      fullRect(3, 2),
      1280,
      720,
    )
    const far = getMirrorScreenSize(
      out(),
      createViewer(new Vector3(0, 0, 50)),
      new Matrix4(),
      fullRect(3, 2),
      1280,
      720,
    )
    expect(far?.width).toBeCloseTo((near?.width ?? 0) / 10, 3)
  })

  it('斜めから見ると、横だけが縮む', () => {
    // 鏡の中心から 10m・45° の位置から、鏡の中心を向く
    const viewer = createViewer(
      new Vector3(10 * Math.SQRT1_2, 0, 10 * Math.SQRT1_2),
      Math.PI / 4,
    )
    const front = getMirrorScreenSize(
      out(),
      createViewer(new Vector3(0, 0, 10)),
      new Matrix4(),
      fullRect(0.2, 0.2),
      1280,
      720,
    )
    const oblique = getMirrorScreenSize(out(), viewer, new Matrix4(), fullRect(0.2, 0.2), 1280, 720)
    // 小さい鏡なので、横はほぼ cos45° 倍・縦はほぼそのまま
    expect((oblique?.width ?? 0) / (front?.width ?? 1)).toBeCloseTo(Math.SQRT1_2, 1)
    expect((oblique?.height ?? 0) / (front?.height ?? 1)).toBeCloseTo(1, 1)
  })

  it('大きい鏡を斜めから見ると、辺の画面上の長さではなく、いちばん細かく映る手前の隅に合わせる', () => {
    // 幅 3m の鏡の中心から 5m・70° の位置から、鏡の中心を向く
    const angle = (70 * Math.PI) / 180
    const viewer = createViewer(new Vector3(5 * Math.sin(angle), 0, 5 * Math.cos(angle)), angle)
    const rect = fullRect(3, 2)
    const size = getMirrorScreenSize(out(), viewer, new Matrix4(), rect, 1280, 720)

    // 下の辺の画面上の長さ
    const toScreen = (x: number, y: number) => {
      const ndc = new Vector3(x, y, 0).project(viewer)
      return new Vector3(ndc.x * 640, ndc.y * 360, 0)
    }
    const edgeLength = toScreen(rect.minX, rect.minY).distanceTo(toScreen(rect.maxX, rect.minY))
    // 手前（+X 側）の隅は平均より細かく映るので、辺の長さより大きい値になる
    expect(size?.width ?? 0).toBeGreaterThan(edgeLength * 1.3)
  })

  it('鏡が動かしてあっても同じ大きさになる', () => {
    const mirrorMatrixWorld = new Matrix4().compose(
      new Vector3(-3, 1.5, 3),
      new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)),
      new Vector3(1, 1, 1),
    )
    const viewer = createViewer(new Vector3(7, 1.5, 3), Math.PI / 2)
    const size = getMirrorScreenSize(out(), viewer, mirrorMatrixWorld, fullRect(3, 2), 1280, 720)
    expect(size?.width).toBeCloseTo((3 * pixelsPerMeterAt1m) / 10, 3)
  })

  it('鏡の隅がカメラの後ろにあるときは null を返す', () => {
    // 鏡のすぐ前で、鏡に沿って横を向いている
    const viewer = createViewer(new Vector3(0, 0, 0.5), Math.PI / 2)
    expect(getMirrorScreenSize(out(), viewer, new Matrix4(), fullRect(4, 4), 1280, 720)).toBeNull()
  })
})
