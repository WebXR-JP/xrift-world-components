/**
 * @vitest-environment jsdom
 */
import { act, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ItemProvider, useItem, type ItemContextValue, type ItemPlacer } from '../ItemContext'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

type ProviderProps = Omit<ComponentProps<typeof ItemProvider>, 'children'>

const PLACER: ItemPlacer = {
  id: 'user-1',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/alice.png',
  isLocalUser: false,
}

/** useItem の戻り値をレンダーごとに記録する */
const createProbe = () => {
  const values: ItemContextValue[] = []
  const Probe = () => {
    values.push(useItem())
    return null
  }
  // Probe が一度も描画されていなければ throw し、アサーションが空虚に通るのを防ぐ
  const latest = () => {
    const value = values[values.length - 1]
    if (!value) throw new Error('Probe has not rendered')
    return value
  }
  return { Probe, latest, renderCount: () => values.length }
}

describe('useItem', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (node: ReactNode) => act(() => root.render(node))

  /** 同じ Probe に対して props を変えて 2 回描画し、それぞれの context 値を返す */
  const renderTwice = (first: ProviderProps, second: ProviderProps) => {
    const { Probe, latest, renderCount } = createProbe()
    render(
      <ItemProvider {...first}>
        <Probe />
      </ItemProvider>,
    )
    const a = latest()
    render(
      <ItemProvider {...second}>
        <Probe />
      </ItemProvider>,
    )
    const b = latest()
    expect(renderCount()).toBe(2)
    return [a, b] as const
  }

  it('Provider 外で呼ぶと例外をスローする', () => {
    const { Probe } = createProbe()
    expect(() => render(<Probe />)).toThrow('useItem must be used within ItemProvider')
  })

  it('id を返し、placedBy を省略すると null になる', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1">
        <Probe />
      </ItemProvider>,
    )

    expect(latest()).toEqual({ id: 'item-1', placedBy: null })
  })

  it('placedBy を渡すと各フィールドがそのまま取得できる', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1" placedBy={PLACER}>
        <Probe />
      </ItemProvider>,
    )

    expect(latest().placedBy).toEqual(PLACER)
  })

  describe('参照同一性', () => {
    it('placedBy 省略時、同じ id で再描画しても参照が変わらない', () => {
      const [a, b] = renderTwice({ id: 'item-1' }, { id: 'item-1' })

      expect(b).toBe(a)
    })

    it('placedBy の各フィールドが同じなら別オブジェクトを渡しても参照が変わらない', () => {
      const [a, b] = renderTwice(
        { id: 'item-1', placedBy: { ...PLACER } },
        { id: 'item-1', placedBy: { ...PLACER } },
      )

      expect(b).toBe(a)
      expect(b.placedBy).toBe(a.placedBy)
    })

    it('placedBy のフィールドが変わると新しい参照になる', () => {
      const [a, b] = renderTwice(
        { id: 'item-1', placedBy: PLACER },
        { id: 'item-1', placedBy: { ...PLACER, displayName: 'Bob' } },
      )

      expect(b).not.toBe(a)
      expect(b.placedBy?.displayName).toBe('Bob')
    })

    it('placedBy が null とオブジェクトの間で切り替わると新しい参照になる', () => {
      const [a, b] = renderTwice({ id: 'item-1' }, { id: 'item-1', placedBy: PLACER })

      expect(b).not.toBe(a)
      expect(a.placedBy).toBeNull()
      expect(b.placedBy).toEqual(PLACER)
    })

    it('id が変わると新しい参照になる', () => {
      const [a, b] = renderTwice(
        { id: 'item-1', placedBy: PLACER },
        { id: 'item-2', placedBy: PLACER },
      )

      expect(b).not.toBe(a)
      expect(b.id).toBe('item-2')
    })
  })
})
