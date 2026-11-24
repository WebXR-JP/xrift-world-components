import { describe, expect, it, vi } from 'vitest'
import { createDevDialogStore } from '../store'

describe('createDevDialogStore の確認', () => {
  it('既定の文言で出し、OK で true が返る', async () => {
    const store = createDevDialogStore()
    const result = store.requestConfirm({ message: '移動しますか？' })
    expect(store.getState().confirm).toEqual({
      title: '確認',
      message: '移動しますか？',
      confirmLabel: 'OK',
      cancelLabel: 'キャンセル',
    })
    store.answerConfirm(true)
    await expect(result).resolves.toBe(true)
    expect(store.getState().confirm).toBeNull()
  })

  it('指定した文言を使い、キャンセルで false が返る', async () => {
    const store = createDevDialogStore()
    const result = store.requestConfirm({ title: 'T', message: 'M', confirmLabel: 'はい', cancelLabel: 'いいえ' })
    expect(store.getState().confirm?.confirmLabel).toBe('はい')
    store.answerConfirm(false)
    await expect(result).resolves.toBe(false)
  })

  it('次の確認が来たら、前の確認は false で閉じる', async () => {
    const store = createDevDialogStore()
    const first = store.requestConfirm({ message: '1' })
    const second = store.requestConfirm({ message: '2' })
    await expect(first).resolves.toBe(false)
    expect(store.getState().confirm?.message).toBe('2')
    store.answerConfirm(true)
    await expect(second).resolves.toBe(true)
  })
})

describe('createDevDialogStore の文字入力', () => {
  const request = (overrides = {}) => ({ id: 'name', onSubmit: vi.fn(), onCancel: vi.fn(), ...overrides })

  it('先に beforeTextInput（VR を抜ける）を待ってから出す', async () => {
    const order: string[] = []
    const store = createDevDialogStore({
      beforeTextInput: async () => {
        order.push('leave-vr')
      },
    })
    store.subscribe(() => order.push('open'))
    store.requestTextInput(request())
    await Promise.resolve()
    await Promise.resolve()
    expect(order).toEqual(['leave-vr', 'open'])
    expect(store.getState().textInput?.id).toBe('name')
  })

  it('確定すると onSubmit に値が渡り、閉じる', async () => {
    const store = createDevDialogStore()
    const r = request()
    store.requestTextInput(r)
    await Promise.resolve()
    store.submitTextInput('hello')
    expect(r.onSubmit).toHaveBeenCalledWith('hello')
    expect(store.getState().textInput).toBeNull()
  })

  it('やめると onCancel が呼ばれる', async () => {
    const store = createDevDialogStore()
    const r = request()
    store.requestTextInput(r)
    await Promise.resolve()
    store.cancelTextInput()
    expect(r.onCancel).toHaveBeenCalled()
    expect(r.onSubmit).not.toHaveBeenCalled()
  })

  it('次の入力が来たら、前の入力はキャンセル扱い', async () => {
    const store = createDevDialogStore()
    const first = request({ id: 'a' })
    store.requestTextInput(first)
    await Promise.resolve()
    store.requestTextInput(request({ id: 'b' }))
    await Promise.resolve()
    expect(first.onCancel).toHaveBeenCalled()
    expect(store.getState().textInput?.id).toBe('b')
  })
})
