import { describe, it, expect } from 'vitest'
import { generateParticlePositions, generateParticleVelocities } from '../utils'

describe('generateParticlePositions', () => {
  it('正しい長さのFloat32Arrayを返す', () => {
    const result = generateParticlePositions(80, 1.0, 1.3)
    expect(result).toBeInstanceOf(Float32Array)
    expect(result.length).toBe(80 * 3)
  })

  it('パーティクル数0で空の配列を返す', () => {
    const result = generateParticlePositions(0, 1.0, 1.3)
    expect(result.length).toBe(0)
  })

  it('各パーティクルのXY座標が半径内に収まる', () => {
    const radius = 1.0
    const aspectRatio = 1.3
    const result = generateParticlePositions(100, radius, aspectRatio)

    for (let i = 0; i < 100; i++) {
      const x = result[i * 3]
      const y = result[i * 3 + 1]
      expect(Math.abs(x)).toBeLessThanOrEqual(radius)
      expect(Math.abs(y)).toBeLessThanOrEqual(radius * aspectRatio)
    }
  })

  it('Z座標が-0.1〜0.1の範囲内に収まる', () => {
    const result = generateParticlePositions(100, 1.0, 1.3)

    for (let i = 0; i < 100; i++) {
      const z = result[i * 3 + 2]
      expect(z).toBeGreaterThanOrEqual(-0.1)
      expect(z).toBeLessThanOrEqual(0.1)
    }
  })
})

describe('generateParticleVelocities', () => {
  it('正しい長さのFloat32Arrayを返す', () => {
    const result = generateParticleVelocities(80)
    expect(result).toBeInstanceOf(Float32Array)
    expect(result.length).toBe(80 * 2)
  })

  it('角速度が0.5〜2.0の範囲内', () => {
    const result = generateParticleVelocities(100)

    for (let i = 0; i < 100; i++) {
      const angularSpeed = result[i * 2]
      expect(angularSpeed).toBeGreaterThanOrEqual(0.5)
      expect(angularSpeed).toBeLessThanOrEqual(2.0)
    }
  })

  it('初期位相が0〜2πの範囲内', () => {
    const result = generateParticleVelocities(100)

    for (let i = 0; i < 100; i++) {
      const phase = result[i * 2 + 1]
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThanOrEqual(Math.PI * 2)
    }
  })
})
