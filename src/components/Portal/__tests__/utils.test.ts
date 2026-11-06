import { describe, it, expect } from 'vitest'
import {
  buildPortalConfirmOptions,
  generateParticlePositions,
  generateParticleVelocities,
  resolvePortalTarget,
  toPortalInfoFromInstance,
  toPortalInfoFromWorld,
} from '../utils'

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

describe('resolvePortalTarget', () => {
  it('instanceId があれば部屋行き', () => {
    expect(resolvePortalTarget({ instanceId: 'i1' })).toEqual({ kind: 'instance', id: 'i1' })
  })

  it('worldId だけならワールド行き', () => {
    expect(resolvePortalTarget({ worldId: 'w1' })).toEqual({ kind: 'world', id: 'w1' })
  })

  it('両方あれば instanceId を優先する（常設の部屋を直指定している）', () => {
    expect(resolvePortalTarget({ instanceId: 'i1', worldId: 'w1' })).toEqual({ kind: 'instance', id: 'i1' })
  })

  it('どちらも無ければ null', () => {
    expect(resolvePortalTarget({})).toBeNull()
    expect(resolvePortalTarget({ instanceId: '', worldId: '' })).toBeNull()
  })
})

const WORLD = {
  id: 'w1',
  name: 'Lobby',
  description: null,
  thumbnailUrl: 'https://example.com/t.png',
  isPublic: true,
  instanceCount: 1,
  totalVisitCount: 10,
  uniqueVisitorCount: 5,
  favoriteCount: 2,
}

describe('toPortalInfoFromInstance / toPortalInfoFromWorld', () => {
  it('部屋は部屋名と人数を持つ', () => {
    const info = toPortalInfoFromInstance({
      id: 'i1',
      name: 'Room A',
      description: null,
      currentUsers: 3,
      maxCapacity: 20,
      isPublic: true,
      allowGuests: true,
      world: WORLD,
    })
    expect(info).toEqual({
      kind: 'instance',
      worldName: 'Lobby',
      thumbnailUrl: 'https://example.com/t.png',
      instanceName: 'Room A',
      currentUsers: 3,
      maxCapacity: 20,
    })
  })

  it('ワールドは部屋名・人数を持たない', () => {
    expect(toPortalInfoFromWorld(WORLD)).toEqual({
      kind: 'world',
      worldName: 'Lobby',
      thumbnailUrl: 'https://example.com/t.png',
    })
  })
})

describe('buildPortalConfirmOptions', () => {
  it('部屋行きは部屋名と人数を出す', () => {
    const options = buildPortalConfirmOptions({
      kind: 'instance',
      worldName: 'Lobby',
      thumbnailUrl: null,
      instanceName: 'Room A',
      currentUsers: 3,
      maxCapacity: 20,
    })
    expect(options.title).toBe('Lobby')
    expect(options.message).toBe('「Room A」に移動しますか？\n👥 3/20')
    expect(options.confirmLabel).toBe('移動する')
  })

  it('ワールド行きは部屋名・人数を出さない', () => {
    const options = buildPortalConfirmOptions({ kind: 'world', worldName: 'Lobby', thumbnailUrl: null })
    expect(options.title).toBe('Lobby')
    expect(options.message).toBe('このワールドに移動しますか？')
  })
})
