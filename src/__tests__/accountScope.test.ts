import { describe, it, expect } from 'vitest'
import { withAccount } from '../lib/api/client'

describe('withAccount', () => {
  it('injects accountId from localStorage', () => {
    const key = 'mfapp.selectedAccountId'
    localStorage.setItem(key, 'acc_123')
    const res = withAccount<{ foo: number }>({ foo: 1 })
    expect((res as any).accountId).toBe('acc_123')
  })

  it('throws when required and missing', () => {
    localStorage.removeItem('mfapp.selectedAccountId')
    expect(() => withAccount({ foo: 1 }, true)).toThrow()
  })
})
