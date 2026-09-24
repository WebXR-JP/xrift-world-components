import { Layers } from 'three'
import { describe, expect, it } from 'vitest'
import { LAYERS } from '../../../constants/layers'
import { applyThirdPersonLayers, shouldUseReflector } from '../utils'
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
