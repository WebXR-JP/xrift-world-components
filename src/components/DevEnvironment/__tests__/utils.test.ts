import { describe, expect, it } from 'vitest'
import { FloatType, HalfFloatType, UnsignedByteType } from 'three'
import { toThreeOutputBufferType } from '../utils'

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
