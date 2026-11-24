import { describe, expect, it } from 'vitest'
import { FloatType, HalfFloatType, Object3D, UnsignedByteType } from 'three'
import { DEV_OVERLAY_ATTRIBUTE, invokeInteract, isGameKeyEvent, toThreeOutputBufferType } from '../utils'

describe('toThreeOutputBufferType', () => {
  it('HalfFloatType 文字列を Three.js の HalfFloatType に変換する', () => {
    expect(toThreeOutputBufferType('HalfFloatType')).toBe(HalfFloatType)
  })

  it('FloatType 文字列を Three.js の FloatType に変換する', () => {
    expect(toThreeOutputBufferType('FloatType')).toBe(FloatType)
  })

  it('UnsignedByteType 文字列を Three.js の UnsignedByteType に変換する', () => {
    expect(toThreeOutputBufferType('UnsignedByteType')).toBe(UnsignedByteType)
  })

  it('null の場合は undefined を返す', () => {
    expect(toThreeOutputBufferType(null)).toBeUndefined()
  })

  it('undefined の場合は undefined を返す', () => {
    expect(toThreeOutputBufferType(undefined)).toBeUndefined()
  })

  it('未知の文字列の場合は undefined を返す', () => {
    expect(toThreeOutputBufferType('InvalidType')).toBeUndefined()
  })
})

describe('isGameKeyEvent', () => {
  const base = { metaKey: false, ctrlKey: false, isComposing: false, target: { tagName: 'BODY' } as unknown as EventTarget }

  it('ページ上で押したキーは操作として扱う', () => {
    expect(isGameKeyEvent(base)).toBe(true)
  })

  it('入力欄・テキストエリアで打っている間は扱わない（g で物を置かない）', () => {
    expect(isGameKeyEvent({ ...base, target: { tagName: 'INPUT' } as unknown as EventTarget })).toBe(false)
    expect(isGameKeyEvent({ ...base, target: { tagName: 'TEXTAREA' } as unknown as EventTarget })).toBe(false)
  })

  it('編集できる要素で打っている間は扱わない', () => {
    expect(
      isGameKeyEvent({ ...base, target: { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget }),
    ).toBe(false)
  })

  it('IME の変換中と Cmd/Ctrl との組み合わせは扱わない', () => {
    expect(isGameKeyEvent({ ...base, isComposing: true })).toBe(false)
    expect(isGameKeyEvent({ ...base, metaKey: true })).toBe(false)
    expect(isGameKeyEvent({ ...base, ctrlKey: true })).toBe(false)
  })
})

describe('invokeInteract', () => {
  it('当たった物から親をたどって onInteract を呼ぶ', () => {
    const calls: string[] = []
    const parent = new Object3D()
    parent.userData = { id: 'button-1', onInteract: (id: string) => calls.push(id) }
    const child = new Object3D()
    parent.add(child)
    expect(invokeInteract(child)).toBe(true)
    expect(calls).toEqual(['button-1'])
  })

  it('onInteract を持つ物が無ければ何もしない', () => {
    expect(invokeInteract(new Object3D())).toBe(false)
    expect(invokeInteract(null)).toBe(false)
  })
})

describe('isGameKeyEvent（確認・文字入力の画面）', () => {
  it('画面の中で押したキーは操作にしない', () => {
    const target = { tagName: 'P', closest: (selector: string) => (selector === `[${DEV_OVERLAY_ATTRIBUTE}]` ? {} : null) }
    expect(isGameKeyEvent({ metaKey: false, ctrlKey: false, isComposing: false, target: target as unknown as EventTarget })).toBe(false)
  })
  it('画面の外なら操作にする', () => {
    const target = { tagName: 'BODY', closest: () => null }
    expect(isGameKeyEvent({ metaKey: false, ctrlKey: false, isComposing: false, target: target as unknown as EventTarget })).toBe(true)
  })
})
