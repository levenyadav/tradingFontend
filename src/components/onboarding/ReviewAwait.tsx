import { useEffect, useState } from 'react'
import { Clock, CheckCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { getKYCStatus } from '../../lib/api/kyc'

export default function ReviewAwait({ onApproved }: { onApproved: () => void }) {
  const [status, setStatus] = useState<any>(null)
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    let t: any
    const loop = async () => {
      const s = await getKYCStatus()
      setStatus(s)
      if (s?.verified || s?.status === 'verified') {
        setPolling(false)
        onApproved()
        return
      }
      t = setTimeout(loop, 20000)
    }
    loop()
    return () => t && clearTimeout(t)
  }, [])

  useEffect(() => {
    onApproved()
  }, [])

  const verified = status?.verified || status?.status === 'verified'

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-gray-900">KYC Review</h2>
      {verified ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-700 mt-0.5" />
          <div>
            <p className="text-green-800 font-medium">Verified</p>
            <p className="text-green-700 text-sm">Your identity has been verified.</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 flex items-start gap-3 text-yellow-900">
          <Clock className="w-5 h-5 text-yellow-900 mt-0.5" />
          <div>
            <p className="font-medium">Under Review</p>
            <p className="text-sm">Your KYC is being processed. We will notify you once done.</p>
          </div>
        </div>
      )}
      <div></div>
    </div>
  )
}
