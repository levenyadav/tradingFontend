import React, { createContext, useContext, useMemo, useReducer } from 'react'
import type { Notification } from '../types'

type Action =
  | { type: 'add'; payload: Notification }
  | { type: 'mark_all_read' }
  | { type: 'clear' }

function reducer(state: Notification[], action: Action): Notification[] {
  switch (action.type) {
    case 'add':
      return [{ ...action.payload }, ...state].slice(0, 100)
    case 'mark_all_read':
      return state.map(n => ({ ...n, read: true }))
    case 'clear':
      return []
    default:
      return state
  }
}

const Ctx = createContext<{
  notifications: Notification[]
  unreadCount: number
  add: (n: Notification) => void
  markAllRead: () => void
  clear: () => void
} | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, [])
  const value = useMemo(() => ({
    notifications: state,
    unreadCount: state.filter(n => !n.read).length,
    add: (n: Notification) => dispatch({ type: 'add', payload: n }),
    markAllRead: () => dispatch({ type: 'mark_all_read' }),
    clear: () => dispatch({ type: 'clear' }),
  }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

// Helper to adapt backend socket payloads to app Notification type
export function mapSocketNotification(payload: any): Notification {
  const title =
    payload?.type === 'transaction' ? 'Transaction Update' :
    payload?.type === 'order_update' ? 'Order Update' :
    payload?.type === 'margin_call' ? 'Margin Call' :
    payload?.type === 'stop_out' ? 'Stop Out' :
    payload?.title || 'Notification'
  const message = payload?.message || payload?.data?.message || 'Update received'
  const id = payload?.id || `n_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  return {
    id,
    title,
    message,
    type: 'info',
    read: false,
    createdAt: new Date().toISOString(),
  }
}

