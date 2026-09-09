/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ItemProvider, useItem, type ItemContextValue, type ItemPlacer } from '../ItemContext'

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true

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
  const latest = () => values[values.length - 1]
  return { Probe, latest }
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

  it('Provider 外で呼ぶと例外をスローする', () => {
    const { Probe } = createProbe()
    // React はレンダー中の例外を console.error にも出すので抑制する
    const originalError = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow('useItem must be used within ItemProvider')
    } finally {
      console.error = originalError
    }
  })

  it('id を返す', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1">
        <Probe />
      </ItemProvider>,
    )

    expect(latest()?.id).toBe('item-1')
  })

  it('placedBy を省略すると null になる', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1">
        <Probe />
      </ItemProvider>,
    )

    expect(latest()?.placedBy).toBeNull()
  })

  it('placedBy を渡すと各フィールドがそのまま取得できる', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1" placedBy={PLACER}>
        <Probe />
      </ItemProvider>,
    )

    expect(latest()?.placedBy).toEqual(PLACER)
  })

  it('placedBy の各フィールドが同じなら別オブジェクトを渡しても参照が変わらない', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1" placedBy={{ ...PLACER }}>
        <Probe />
      </ItemProvider>,
    )
    const first = latest()

    render(
      <ItemProvider id="item-1" placedBy={{ ...PLACER }}>
        <Probe />
      </ItemProvider>,
    )
    const second = latest()

    expect(second).toBe(first)
    expect(second?.placedBy).toBe(first?.placedBy)
  })

  it('placedBy のフィールドが変わると新しい参照になる', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1" placedBy={PLACER}>
        <Probe />
      </ItemProvider>,
    )
    const first = latest()

    render(
      <ItemProvider id="item-1" placedBy={{ ...PLACER, displayName: 'Bob' }}>
        <Probe />
      </ItemProvider>,
    )
    const second = latest()

    expect(second).not.toBe(first)
    expect(second?.placedBy?.displayName).toBe('Bob')
  })

  it('id が変わると新しい参照になる', () => {
    const { Probe, latest } = createProbe()
    render(
      <ItemProvider id="item-1" placedBy={PLACER}>
        <Probe />
      </ItemProvider>,
    )
    const first = latest()

    render(
      <ItemProvider id="item-2" placedBy={PLACER}>
        <Probe />
      </ItemProvider>,
    )
    const second = latest()

    expect(second).not.toBe(first)
    expect(second?.id).toBe('item-2')
  })
})
