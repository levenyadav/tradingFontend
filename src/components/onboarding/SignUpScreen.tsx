import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Mail, Lock, Phone, Gift, Check, X, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Checkbox } from '../ui/checkbox'
import { register, login } from '../../lib/api/auth'
import { saveSession } from '../../lib/storage/session'
import { validateReferralCode } from '../../lib/api/referral'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover'
import { Calendar } from '../ui/calendar'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../ui/command'
import { countries, isoToFlagClass, findCountryByIso } from '../../lib/countries'
import { useIsMobile } from '../ui/use-mobile'

export default function SignUpScreen({ onBack, onNext, onError }: { onBack: () => void; onNext: (user: any) => void; onError?: (msg: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [country, setCountry] = useState('')
  const [countryError, setCountryError] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [referralValidating, setReferralValidating] = useState(false)
  const [referralValid, setReferralValid] = useState<boolean | null>(null)
  const [referralMessage, setReferralMessage] = useState('')
  const [referrerName, setReferrerName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string>('')
  const [dobOpen, setDobOpen] = useState(false)
  const [dialCode, setDialCode] = useState('')
  const isMobile = useIsMobile()
  const [countryOpen, setCountryOpen] = useState(false)
  const countryList = useMemo(() => {
    const excludes = new Set(['AU','DE','FR','ES','IT','RU','CN','JP'])
    const filtered = countries.filter(c => !excludes.has(c.iso))
    const top = filtered.find(c => c.iso === 'IN')
    const rest = filtered.filter(c => c.iso !== 'IN')
    return top ? [top, ...rest] : filtered
  }, [])

  const normalizeCountry = (s: string) => {
    const m: Record<string, string> = {
      india: 'IN',
      'united states': 'US',
      usa: 'US',
      us: 'US',
      'united kingdom': 'GB',
      uk: 'GB',
      britain: 'GB',
      canada: 'CA',
      singapore: 'SG',
      mexico: 'MX',
      brazil: 'BR',
      nigeria: 'NG',
      'south africa': 'ZA',
      indonesia: 'ID',
      uae: 'AE',
      'united arab emirates': 'AE',
      'saudi arabia': 'SA'
    }
    const t = (s || '').trim()
    if (t.length === 2) return t.toUpperCase()
    const k = t.toLowerCase()
    return m[k] || ''
  }

  // Debounced referral code validation
  useEffect(() => {
    if (!referralCode || referralCode.length < 6) {
      setReferralValid(null)
      setReferralMessage('')
      setReferrerName('')
      return
    }

    const timer = setTimeout(async () => {
      setReferralValidating(true)
      try {
        const result = await validateReferralCode(referralCode.toUpperCase().trim())
        if (result.valid && result.referrer) {
          setReferralValid(true)
          setReferralMessage('Valid referral code')
          setReferrerName(`${result.referrer.firstName} ${result.referrer.lastName}`)
        } else {
          setReferralValid(false)
          setReferralMessage(result.message || 'Invalid referral code')
          setReferrerName('')
        }
      } catch (e: any) {
        setReferralValid(false)
        setReferralMessage(e?.message || 'Invalid referral code')
        setReferrerName('')
      } finally {
        setReferralValidating(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [referralCode])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)
    setPasswordError('')
    try {
      if (!acceptedTerms) {
        onError?.('Please accept Terms & Conditions')
        setFormError('Please accept Terms & Conditions')
        setIsLoading(false)
        return
      }
      const iso = normalizeCountry(country)
      if (!iso) {
        setCountryError('Enter a 2-letter ISO code (e.g., IN)')
        setFormError('Please fix the highlighted fields')
        setIsLoading(false)
        return
      }
      setCountryError('')
      const digitsOnly = (phone || '').replace(/\D/g, '')
      const payload: any = { email, password, firstName, lastName, phone: digitsOnly, dateOfBirth, country: iso, acceptedTerms }
      // Include referral code if provided and valid
      if (referralCode && referralCode.trim()) {
        payload.referralCode = referralCode.toUpperCase().trim()
      }
      const res = await register(payload)
      // Move to OTP step with userId
      onNext({ id: res.userId || res.user.id, email: res.user.email })
    } catch (e: any) {
      const details = e?.data?.details || e?.error?.details
      const msg = Array.isArray(details) ? (details.map((d: any)=>`${d.field}: ${d.message}`).join('; ')) : (e?.message || 'Registration failed')
      if (Array.isArray(details)) {
        const c = details.find((d: any)=>String(d.field).toLowerCase()==='country' && d.message)
        if (c) setCountryError(c.message)
        const p = details.find((d: any)=>String(d.field).toLowerCase()==='password' && d.message)
        if (p) setPasswordError(p.message)
      }
      setFormError(msg)
      onError?.(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="p-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>
      <div className="flex-1 px-6 pt-4">
        {formError && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" aria-live="polite">{formError}</div>
        )}
        <h1 className="text-gray-900 mb-2">Create your account</h1>
        <p className="text-gray-600 mb-6">Start trading in minutes</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} className="h-12 rounded-lg" required />
            <Input placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} className="h-12 rounded-lg" required />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} className="pl-10 h-12 rounded-lg" required />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            {dialCode && (
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-700 text-sm bg-white px-2 py-0.5 rounded border border-input shadow-sm pointer-events-none select-none min-w-[48px] text-center">+{dialCode}</span>
            )}
            <Input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e)=>setPhone(e.target.value.replace(/[^0-9+]/g,''))}
              className="h-12 rounded-lg"
              style={{ paddingLeft: dialCode ? '112px' : '40px' }}
              aria-label="Phone number"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className={`pl-10 h-12 rounded-lg ${passwordError ? 'border-red-400' : ''}`} required aria-invalid={!!passwordError} aria-describedby={passwordError ? 'password-error' : undefined} />
            {passwordError && <div id="password-error" className="mt-1 text-xs text-red-600">{passwordError}</div>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isMobile ? (
              <Input type="date" placeholder="Date of Birth" value={dateOfBirth} onChange={(e)=>setDateOfBirth(e.target.value)} className="h-12 rounded-lg" />
            ) : (
              <Popover open={dobOpen} onOpenChange={setDobOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-12 w-full rounded-lg border bg-input-background px-3 text-left text-sm outline-none focus-visible:ring-[3px]">
                    <span className="flex items-center gap-2 text-gray-700">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                      {dateOfBirth ? dateOfBirth.split('-').reverse().join('/') : 'dd/mm/yyyy'}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="bg-white text-gray-900 p-0 w-auto" sideOffset={8}>
                  <Calendar
                    mode="single"
                    selected={dateOfBirth ? new Date(dateOfBirth) : undefined}
                    onSelect={(d)=>{ if (d) { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); setDateOfBirth(`${y}-${m}-${day}`); } setDobOpen(false); }}
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            )}
            <div>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className={`border-input focus-visible:border-ring focus-visible:ring-ring/50 h-12 w-full rounded-lg border bg-white px-3 text-left text-sm outline-none focus-visible:ring-[3px] ${countryError? 'border-red-400':''}`} aria-label="Select country">
                    <span className="flex items-center gap-2 text-gray-700">
                      {country ? (<span className={isoToFlagClass(country)} />) : null}
                      {country ? (countries.find(c=>c.iso===country)?.name || country) : 'Country'}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="bg-white text-gray-900 p-0 w-[320px] max-h-[60vh] overflow-y-auto" sideOffset={8}>
                  <Command className="h-[60vh]">
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No results.</CommandEmpty>
                      <CommandGroup>
                        {countryList.map((c)=> (
                          <CommandItem key={c.iso} onSelect={() => { setCountry(c.iso); setDialCode(c.dial); setCountryError(''); setCountryOpen(false); }}>
                            <span className={`${isoToFlagClass(c.iso)} mr-2`} />
                            {c.name} <span className="ml-auto text-muted-foreground">+{c.dial}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {countryError && <div className="text-xs text-red-600 mt-1">{countryError}</div>}
            </div>
          </div>
          <div>
            <div className="relative">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChange={(e)=>setReferralCode(e.target.value.toUpperCase())}
                className={`pl-10 h-12 rounded-lg ${referralValid === false ? 'border-red-400' : referralValid === true ? 'border-green-500' : ''}`}
                maxLength={12}
              />
              {referralValidating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!referralValidating && referralValid === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
              {!referralValidating && referralValid === false && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-5 h-5 text-red-600" />
                </div>
              )}
            </div>
            {referrerName && (
              <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Referred by: {referrerName}
              </div>
            )}
            {referralMessage && !referrerName && (
              <div className={`mt-1 text-xs ${referralValid ? 'text-green-600' : 'text-red-600'}`}>
                {referralMessage}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(v)=>setAcceptedTerms(!!v)} />
            <label htmlFor="terms" className="text-sm text-gray-700">I accept the <a className="text-blue-700">Terms & Conditions</a></label>
          </div>
          <Button type="submit" className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-white rounded-lg" disabled={isLoading}>
            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign Up'}
          </Button>
        </form>
      </div>
    </div>
  )
}
