import { useEffect, useMemo, useState } from 'react'
import { getAccountsSummary } from '../../lib/api/accounts'
import { formatCurrency } from '../../lib/mockData'

export default function AccountsManagement({ onBack, onCreateNew }: { onBack: () => void; onCreateNew: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [visibleCount, setVisibleCount] = useState(20)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { summary, accounts } = await getAccountsSummary('active')
        if (!mounted) return
        setSummary(summary)
        setAccounts(accounts)
      } catch (e: any) {
        setError(e?.message || 'Failed to load accounts')
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setVisibleCount((v) => v + 20)
    }, { rootMargin: '160px' })
    const el = document.getElementById('accounts-sentinel')
    if (el) io.observe(el)
    return () => io.disconnect()
  }, [accounts.length])

  const totals = useMemo(() => {
    const s = summary || {}
    return {
      totalAccounts: s.totalAccounts ?? accounts.length,
      totalBalance: s.totalBalance ?? accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
      totalEquity: s.totalEquity ?? accounts.reduce((sum, a) => sum + (a.equity || 0), 0),
      totalMarginUsed: s.totalMarginUsed ?? accounts.reduce((sum, a) => sum + (a.margin || 0), 0),
      netDeposits: s.netDeposits ?? 0,
    }
  }, [summary, accounts])

  return (
    <div className="pb-20 md:pb-8">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white mb-1">Accounts</h2>
            <p className="text-blue-100">Trading management</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onCreateNew} className="px-3 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50">Create New Account</button>
          </div>
        </div>
        {loading && (<div className="mt-3 bg-white/10 text-white rounded px-3 py-2 text-sm">Loading…</div>)}
        {error && (<div className="mt-3 bg-red-500/20 text-white rounded px-3 py-2 text-sm" role="alert">{error}</div>)}
      </div>

      <div className="px-4 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-1/5" />
              </div>
            ))
          ) : (
            <>
              <div className="bg.white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total Accounts</p>
                <p className="text-lg text-gray-900">{totals.totalAccounts}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total Balance</p>
                <p className="text-lg text-gray-900">{formatCurrency(totals.totalBalance)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Total Equity</p>
                <p className="text-lg text-gray-900">{formatCurrency(totals.totalEquity)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Margin Used</p>
                <p className="text-lg text-gray-900">{formatCurrency(totals.totalMarginUsed)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Net Deposits</p>
                <p className="text-lg text-gray-900">{formatCurrency(totals.netDeposits)}</p>
              </div>
            </>
          )}
        </div>

        {/* Accounts List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-full bg-white rounded-lg p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/5" />
              </div>
            ))
          ) : (
            accounts.slice(0, visibleCount).map((a) => (
              <div key={a._id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-900">{a.accountNumber}</p>
                    <p className="text-xs text-gray-500">{a.accountType.toUpperCase()} • {a.currency} • 1:{a.leverage}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${a.status==='active' ? 'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{a.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Balance</p>
                    <p className="text-gray-900">{formatCurrency(a.balance)}</p>
                  </div>
                  <div>
                    <p className="text.gray-500">Equity</p>
                    <p className="text-gray-900">{formatCurrency(a.equity)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Free Margin</p>
                    <p className="text-gray-900">{formatCurrency(a.freeMargin)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Margin Level</p>
                    <p className={`${a.marginLevel>100?'text-green-600':'text-red-600'}`}>{a.marginLevel}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Open Positions</p>
                    <p className="text-gray-900">{a.statistics?.openPositions ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pending Orders</p>
                    <p className="text-gray-900">{a.statistics?.pendingOrders ?? 0}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div id="accounts-sentinel" className="h-8" />
        </div>
      </div>
    </div>
  )
}
