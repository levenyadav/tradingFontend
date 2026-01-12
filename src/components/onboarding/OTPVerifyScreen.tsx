import { useEffect, useState } from 'react'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp'
import { Button } from '../ui/button'
import { verifyOtp, resendOtp } from '../../lib/api/auth'
import { saveSession } from '../../lib/storage/session'

export default function OTPVerifyScreen({ userId, email, onVerified, onError }: { userId: string; email?: string; onVerified: () => void; onError?: (msg: string) => void }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(30)
  const [errorText, setErrorText] = useState<string>('')

  useEffect(() => {
    const t = setInterval(() => setCooldown((c)=> Math.max(0, c-1)), 1000)
    return () => clearInterval(t)
  }, [])

  const submit = async () => {
    if (code.length !== 4) return
    setLoading(true)
    try {
      const res = await verifyOtp({ userId, code })
      saveSession({ tokens: res.tokens, sessionId: res.sessionId }, true)
      onVerified()
    } catch (e: any) {
      const msg = e?.error?.message || e?.data?.message || e?.message || 'Invalid or expired code'
      setErrorText(msg)
      onError?.(msg)
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    setCooldown(30)
    try { await resendOtp({ userId }) }
    catch (e: any) {
      const msg = e?.error?.message || e?.data?.message || e?.message || 'Failed to resend code'
      setErrorText(msg)
      onError?.(msg)
    }
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <h2 className="text-gray-900">Verify your email</h2>
      <p className="text-gray-600 mb-4">Enter the 4-digit code sent to {email || 'your email'}</p>
      <div aria-label="Verification code" aria-invalid={!!errorText} aria-describedby={errorText ? 'otp-error' : undefined}>
        <InputOTP maxLength={4} value={code} onChange={setCode}>
          <InputOTPGroup className="gap-3">
            <InputOTPSlot index={0} className="h-12 w-12 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <InputOTPSlot index={1} className="h-12 w-12 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <InputOTPSlot index={2} className="h-12 w-12 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <InputOTPSlot index={3} className="h-12 w-12 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </InputOTPGroup>
        </InputOTP>
        {errorText && <div id="otp-error" className="mt-2 text-sm text-red-600">{errorText}</div>}
      </div>
      <div className="mt-4 flex gap-3">
        <Button onClick={submit} disabled={loading || code.length!==4} className="bg-blue-700 text-white h-11 rounded-lg">Verify</Button>
        <Button onClick={resend} variant="outline" disabled={cooldown>0} className="h-11 rounded-lg text-gray-900">{cooldown>0?`Resend in ${cooldown}s`:'Resend code'}</Button>
      </div>
    </div>
  )
}
