import { describe, expect, it } from 'vitest'
import { FloatType, HalfFloatType, UnsignedByteType } from 'three'
import { isGameKeyEvent, toThreeOutputBufferType } from '../utils'

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
