import { describe, expect, it } from 'vitest'
import { createDefaultItemLoaderImplementation } from '../../../contexts/ItemLoaderContext'
import { errorFromResolveStatus } from '../itemLoader'

describe('errorFromResolveStatus', () => {
  it('HTTP の状態から理由を決める', () => {
    expect(errorFromResolveStatus(401, false).code).toBe('LOGIN_REQUIRED')
    expect(errorFromResolveStatus(403, false).code).toBe('FORBIDDEN')
    expect(errorFromResolveStatus(404, false).code).toBe('NOT_FOUND')
    expect(errorFromResolveStatus(500, false).code).toBe('LOAD_FAILED')
  })

  it('中継が無い（JSON でない応答）ときは状態に関係なく NOT_AVAILABLE', () => {
    const error = errorFromResolveStatus(404, true)
    expect(error.code).toBe('NOT_AVAILABLE')
    expect(error.message).toContain('xriftDev()')
  })
})

describe('createDefaultItemLoaderImplementation', () => {
  it('読む手段が無いことを NOT_AVAILABLE で伝える', async () => {
    await expect(createDefaultItemLoaderImplementation().load('item-1')).rejects.toMatchObject({
      code: 'NOT_AVAILABLE',
    })
  })
})
