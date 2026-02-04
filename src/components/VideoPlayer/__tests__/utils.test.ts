import { describe, it, expect } from 'vitest'
import { formatTime } from '../utils'

describe('formatTime', () => {
  it('0秒を0:00にフォーマット', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('59秒を0:59にフォーマット', () => {
    expect(formatTime(59)).toBe('0:59')
  })

  it('60秒を1:00にフォーマット', () => {
    expect(formatTime(60)).toBe('1:00')
  })

  it('90秒を1:30にフォーマット', () => {
    expect(formatTime(90)).toBe('1:30')
  })

  it('3661秒を61:01にフォーマット', () => {
    expect(formatTime(3661)).toBe('61:01')
  })

  it('小数点以下を切り捨て', () => {
    expect(formatTime(65.9)).toBe('1:05')
  })
})
