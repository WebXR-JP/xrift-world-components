import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { getBillboardYRotation } from '../utils'

describe('getBillboardYRotation', () => {
  it('カメラが正面(+Z方向)にある場合、回転角度が0になる', () => {
    const cameraPos = new Vector3(0, 0, 5)
    const targetPos = new Vector3(0, 0, 0)
    const rotation = getBillboardYRotation(cameraPos, targetPos)
    expect(rotation).toBeCloseTo(0)
  })

  it('カメラが背面(-Z方向)にある場合、回転角度がπになる', () => {
    const cameraPos = new Vector3(0, 0, -5)
    const targetPos = new Vector3(0, 0, 0)
    const rotation = getBillboardYRotation(cameraPos, targetPos)
    expect(rotation).toBeCloseTo(Math.PI)
  })

  it('カメラが右側(+X方向)にある場合、回転角度がπ/2になる', () => {
    const cameraPos = new Vector3(5, 0, 0)
    const targetPos = new Vector3(0, 0, 0)
    const rotation = getBillboardYRotation(cameraPos, targetPos)
    expect(rotation).toBeCloseTo(Math.PI / 2)
  })

  it('カメラが左側(-X方向)にある場合、回転角度が-π/2になる', () => {
    const cameraPos = new Vector3(-5, 0, 0)
    const targetPos = new Vector3(0, 0, 0)
    const rotation = getBillboardYRotation(cameraPos, targetPos)
    expect(rotation).toBeCloseTo(-Math.PI / 2)
  })

  it('Y座標の差は回転角度に影響しない', () => {
    const cameraPos1 = new Vector3(3, 0, 4)
    const cameraPos2 = new Vector3(3, 100, 4)
    const targetPos = new Vector3(0, 0, 0)
    const rotation1 = getBillboardYRotation(cameraPos1, targetPos)
    const rotation2 = getBillboardYRotation(cameraPos2, targetPos)
    expect(rotation1).toBeCloseTo(rotation2)
  })

  it('ターゲットが原点以外でも正しく計算できる', () => {
    const cameraPos = new Vector3(10, 5, 10)
    const targetPos = new Vector3(10, 0, 5)
    const rotation = getBillboardYRotation(cameraPos, targetPos)
    // dx=0, dz=5 → atan2(0, 5) = 0
    expect(rotation).toBeCloseTo(0)
  })
})
