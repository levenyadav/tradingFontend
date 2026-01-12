import { useState } from 'react'
import SignUpScreen from './SignUpScreen'
import AccountSetup from './AccountSetup'
import OTPVerifyScreen from './OTPVerifyScreen'
// KYC removed from onboarding

type Step = 'signup' | 'otp' | 'account' | 'created'

export default function OnboardingFlow({ onDeposit, onSkip, onCancel, onError }: { onDeposit: () => void; onSkip: () => void; onCancel: () => void; onError?: (msg: string) => void }) {
  const [step, setStep] = useState<Step>('signup')
  const [pendingUserId, setPendingUserId] = useState<string>('')
  const [pendingEmail, setPendingEmail] = useState<string>('')

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
        <div className="px-6 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={step==='signup'? 'text-blue-700 font-semibold':'text-gray-600'}>Registration</span>
            <span className="text-gray-300">›</span>
            <span className={step!=='signup'? 'text-blue-700 font-semibold':'text-gray-600'}>Account</span>
          </div>
          <div className="mt-2 h-1 w-full bg-gray-100 rounded">
            <div className={`h-1 rounded bg-gradient-to-r from-blue-600 to-blue-800 transition-all`} style={{ width: step==='signup'? '50%': '100%' }}></div>
          </div>
        </div>
      </div>
      {step === 'signup' && (
        <SignUpScreen onBack={onCancel} onNext={(user: any) => { setPendingUserId(user?.id || ''); setPendingEmail(user?.email || ''); setStep('otp') }} onError={onError} />
      )}
      {step === 'otp' && (
        <OTPVerifyScreen userId={pendingUserId} email={pendingEmail} onVerified={() => setStep('account')} onError={onError} />
      )}
      {step === 'account' && (
        <AccountSetup onBack={() => setStep('signup')} onNext={() => setStep('created')} onError={onError} />
      )}
      {step === 'created' && (
        <div className="p-6 space-y-4">
          <h2 className="text-gray-900">Configuration</h2>
          <p className="text-gray-700">Your trading account is created — you can trade and deposit now.</p>
          <div className="flex gap-3">
            <button onClick={onDeposit} className="w-full bg-blue-700 text-white rounded-lg h-12">Deposit now</button>
            <button onClick={onSkip} className="w-full bg-gray-100 text-gray-700 rounded-lg h-12">Skip for now</button>
          </div>
        </div>
      )}
    </div>
  )
}
