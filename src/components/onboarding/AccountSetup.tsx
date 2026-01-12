import { useState } from 'react'
import { Button } from '../ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { openAccount } from '../../lib/api/accounts'
import { getAccessToken } from '../../lib/storage/session'

export default function AccountSetup({ onBack, onNext, onError }: { onBack: () => void; onNext: (account: any) => void; onError?: (msg: string) => void }) {
  const [accountType, setAccountType] = useState('standard')
  const [currency, setCurrency] = useState('USD')
  const [leverage, setLeverage] = useState(100)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async () => {
    setLoading(true)
    try {
      const token = getAccessToken()
      if (!token) {
        setMessage('{"error":{"code":401,"message":"Token required"}}')
        onError?.('Token required')
        return
      }
      const acc = await openAccount({ accountType, currency, leverage })
      onNext(acc)
    } catch (e: any) {
      const code401 = e?.status === 401 || e?.data?.error?.code === 401
      if (code401) {
        setMessage('{"error":{"code":401,"message":"Token required"}}')
        onError?.('Token required')
      } else {
        setMessage(e?.message || 'Account creation failed')
        onError?.(e?.message || 'Account creation failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-gray-900">Create Trading Account</h2>
      <p className="text-gray-600">Choose your preferred account type, currency, and leverage.</p>
      {message && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{message}</div>
      )}
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-700">Account Type</label>
          <Select value={accountType} onValueChange={setAccountType}>
            <SelectTrigger className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-md px-4">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="w-full min-w-full bg-white border border-gray-200 rounded-md shadow-md" style={{ minWidth: '100%' }}>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="standard">Standard</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="pro">Pro</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="ecn">ECN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Currency</label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-md px-4">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent className="w-full min-w-full bg-white border border-gray-200 rounded-md shadow-md" style={{ minWidth: '100%' }}>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Leverage</label>
          <Select value={String(leverage)} onValueChange={(v)=>setLeverage(Number(v))}>
            <SelectTrigger className="w-full h-11 bg-white text-gray-900 border border-gray-300 rounded-md px-4">
              <SelectValue placeholder="Select leverage" />
            </SelectTrigger>
            <SelectContent className="w-full min-w-full bg-white border border-gray-200 rounded-md shadow-md" style={{ minWidth: '100%' }}>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="100">1:100</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="200">1:200</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="300">1:300</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="400">1:400</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="500">1:500</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="1000">1:1000</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="1500">1:1500</SelectItem>
              <SelectItem className="relative w-full text-left text-gray-900 py-3 pl-9 pr-8 hover:bg-gray-50" value="2000">1:2000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button onClick={onBack} variant="outline" className="text-gray-700 h-11 rounded-md">Back</Button>
        <Button onClick={submit} className="bg-blue-700 text-white h-11 rounded-md" disabled={loading}>{loading?'Creating...':'Create Account'}</Button>
      </div>
    </div>
  )
}
