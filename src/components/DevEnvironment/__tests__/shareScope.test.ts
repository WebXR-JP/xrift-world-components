/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { FEDERATION_SHARED_VERSIONS } from '../../../federationShared'
import { Item } from '../../Item'
import { buildDevShareScope } from '../shareScope'

describe('buildDevShareScope', () => {
  it('アイテムが使う共有依存を全部、本番と同じ版キーで用意する', async () => {
    const scope = await buildDevShareScope()
    expect(Object.keys(scope).sort()).toEqual(
      [
        '@pmndrs/uikit',
        '@react-three/drei',
        '@react-three/fiber',
        '@react-three/rapier',
        '@react-three/uikit',
        '@xrift/world-components',
        'react',
        'react/jsx-runtime',
        'three',
        'three/addons/loaders/DRACOLoader.js',
        'three/addons/loaders/GLTFLoader.js',
        'three/addons/loaders/KTX2Loader.js',
      ].sort(),
    )
    // 版キーは正本の表と一致する（本番の xrift-frontend も同じ表を使う）
    for (const [name, versions] of Object.entries(scope)) {
      expect(Object.keys(versions)).toEqual([
        FEDERATION_SHARED_VERSIONS[name as keyof typeof FEDERATION_SHARED_VERSIONS],
      ])
    }
    expect(Object.keys(scope.react)).toEqual(['19.1.1'])
  })

  it('自分自身はワールドが import しているのと同じ実体を渡す（Context が別物にならない）', async () => {
    const scope = await buildDevShareScope()
    const factory = await scope['@xrift/world-components']['0.1.0'].get()
    const module = factory() as { Item: unknown }
    expect(module.Item).toBe(Item)
  })
})
