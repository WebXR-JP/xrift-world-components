import { describe, expect, it } from 'vitest'
import { normalizeTextInput } from '../utils'

describe('normalizeTextInput', () => {
  it('前後の空白を除く', () => {
    expect(normalizeTextInput('  こんにちは  ')).toBe('こんにちは')
  })
  it('空白だけなら確定できない', () => {
    expect(normalizeTextInput('   ')).toBeNull()
    expect(normalizeTextInput('')).toBeNull()
  })
  it('最大文字数で切る', () => {
    expect(normalizeTextInput('abcdef', 3)).toBe('abc')
  })
})
