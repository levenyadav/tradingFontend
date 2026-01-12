import { describe, it, expect } from 'vitest'
import { saveSession, getAccessToken, clearSession, getRefreshToken, getSessionId } from '../lib/storage/session'

describe('session persistence', () => {
  it('saves to sessionStorage when rememberMe=false', () => {
    clearSession()
    const payload = { tokens: { accessToken: 'a_token', refreshToken: 'r_token' }, sessionId: 's_id' }
    saveSession(payload, false)
    expect(sessionStorage.getItem('fx.accessToken')).toBe('a_token')
    expect(sessionStorage.getItem('fx.refreshToken')).toBe('r_token')
    expect(sessionStorage.getItem('fx.sessionId')).toBe('s_id')
    expect(localStorage.getItem('fx.accessToken')).toBeNull()
    expect(getAccessToken()).toBe('a_token')
  })

  it('stores expiresAt in selected store when expiresIn provided', () => {
    clearSession()
    const now = Date.now()
    const payload = { tokens: { accessToken: 'a', refreshToken: 'b', expiresIn: '600m' }, sessionId: 's' }
    saveSession(payload, true)
    const expiresAt = Number(localStorage.getItem('fx.expiresAt'))
    expect(expiresAt).toBeGreaterThan(now + 59 * 60 * 1000)
    expect(expiresAt).toBeLessThan(now + 601 * 60 * 1000)
  })

  it('saves to localStorage when rememberMe=true', () => {
    clearSession()
    const payload = { tokens: { accessToken: 'L', refreshToken: 'R' }, sessionId: 'S' }
    saveSession(payload, true)
    expect(localStorage.getItem('fx.accessToken')).toBe('L')
    expect(localStorage.getItem('fx.refreshToken')).toBe('R')
    expect(localStorage.getItem('fx.sessionId')).toBe('S')
    expect(sessionStorage.getItem('fx.accessToken')).toBeNull()
  })

  it('clearSession clears both stores', () => {
    localStorage.setItem('fx.accessToken','x')
    sessionStorage.setItem('fx.accessToken','y')
    localStorage.setItem('fx.refreshToken','x')
    sessionStorage.setItem('fx.refreshToken','y')
    localStorage.setItem('fx.sessionId','x')
    sessionStorage.setItem('fx.sessionId','y')
    clearSession()
    expect(localStorage.getItem('fx.accessToken')).toBeNull()
    expect(sessionStorage.getItem('fx.accessToken')).toBeNull()
    expect(localStorage.getItem('fx.refreshToken')).toBeNull()
    expect(sessionStorage.getItem('fx.refreshToken')).toBeNull()
    expect(localStorage.getItem('fx.sessionId')).toBeNull()
    expect(sessionStorage.getItem('fx.sessionId')).toBeNull()
  })
})
