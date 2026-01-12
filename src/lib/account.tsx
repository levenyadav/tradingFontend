import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type AccountCtx = {
  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void
  accounts: any[]
  setAccounts: (list: any[]) => void
}

const STORAGE_KEY = 'mfapp.selectedAccountId'

const Ctx = createContext<AccountCtx | null>(null)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSelectedAccountId(saved)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (selectedAccountId) localStorage.setItem(STORAGE_KEY, selectedAccountId)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [selectedAccountId])

  useEffect(() => {
    if (!accounts || accounts.length === 0) return
    const exists = selectedAccountId ? accounts.some(a => String(a._id) === String(selectedAccountId)) : false
    if (!exists) {
      if (accounts.length === 1) {
        const only = accounts[0]
        if (only && only._id) setSelectedAccountId(String(only._id))
      } else {
        // Clear invalid selection to trigger UI prompt in TopBar
        setSelectedAccountId(null)
      }
    }
  }, [accounts, selectedAccountId])

  const value = useMemo(() => ({ selectedAccountId, setSelectedAccountId, accounts, setAccounts }), [selectedAccountId, accounts])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAccount() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    const selected = getSelectedAccountId()
    const fallback: AccountCtx = {
      selectedAccountId: selected,
      setSelectedAccountId: (id) => {
        try {
          if (id) localStorage.setItem(STORAGE_KEY, id)
          else localStorage.removeItem(STORAGE_KEY)
        } catch {}
      },
      accounts: [],
      setAccounts: () => {},
    }
    return fallback
  }
  return ctx
}

export function getSelectedAccountId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
