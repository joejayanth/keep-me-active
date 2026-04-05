import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Dumbbell, Phone, ChevronRight, ArrowLeft } from 'lucide-react'
import type { ConfirmationResult } from 'firebase/auth'

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', name: 'US' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+91', flag: '🇮🇳', name: 'IN' },
  { code: '+61', flag: '🇦🇺', name: 'AU' },
  { code: '+65', flag: '🇸🇬', name: 'SG' },
  { code: '+971', flag: '🇦🇪', name: 'AE' },
  { code: '+60', flag: '🇲🇾', name: 'MY' },
]

export default function LoginPage() {
  const { signInWithGoogle, sendPhoneOtp, confirmPhoneOtp } = useAuth()

  // Phone auth state
  const [step, setStep] = useState<'main' | 'phone' | 'otp'>('main')
  const [countryCode, setCountryCode] = useState('+1')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '') || 'Google sign-in failed')
    }
    setLoading(false)
  }

  const handleSendOtp = async () => {
    const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`
    if (phone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid phone number')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await sendPhoneOtp(fullPhone, 'recaptcha-container')
      setConfirmationResult(result)
      setStep('otp')
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '') || 'Failed to send OTP')
    }
    setLoading(false)
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of full OTP
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d })
      setOtp(newOtp)
      otpRefs.current[Math.min(index + digits.length, 5)]?.focus()
      return
    }
    const newOtp = [...otp]
    newOtp[index] = value.replace(/\D/g, '')
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOtp = async () => {
    const code = otp.join('')
    if (code.length < 6) {
      setError('Enter the 6-digit code')
      return
    }
    if (!confirmationResult) return
    setError('')
    setLoading(true)
    try {
      await confirmPhoneOtp(confirmationResult, code)
    } catch (err: any) {
      setError('Invalid code. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    }
    setLoading(false)
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-bg px-6">
      {/* Invisible recaptcha container */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 mb-4">
            <Dumbbell className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Keep Me Active</h1>
          <p className="text-gray-400 mt-2">Track workouts. Build streaks. Stay strong.</p>
        </div>

        {/* ── MAIN STEP ── */}
        {step === 'main' && (
          <div className="space-y-3">
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3.5 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-surface-light" />
              <span className="text-gray-500 text-sm">or</span>
              <div className="flex-1 h-px bg-surface-light" />
            </div>

            {/* Phone */}
            <button
              onClick={() => { setStep('phone'); setError('') }}
              disabled={loading}
              className="w-full flex items-center justify-between bg-surface text-white font-medium py-3.5 px-4 rounded-xl border border-surface-light hover:border-primary transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary" />
                Continue with Phone
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            {error && <p className="text-accent-red text-sm text-center">{error}</p>}
          </div>
        )}

        {/* ── PHONE STEP ── */}
        {step === 'phone' && (
          <div>
            <button onClick={() => { setStep('main'); setError('') }} className="flex items-center gap-1 text-gray-400 mb-5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-white font-bold text-xl mb-1">Enter your number</h2>
            <p className="text-gray-400 text-sm mb-5">We'll send a verification code via SMS</p>

            <div className="flex gap-2 mb-4">
              {/* Country code picker */}
              <select
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="bg-surface text-white px-3 py-3.5 rounded-xl border border-surface-light focus:border-primary focus:outline-none text-sm"
              >
                {COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              {/* Phone number */}
              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="flex-1 bg-surface text-white placeholder-gray-500 px-4 py-3.5 rounded-xl border border-surface-light focus:border-primary focus:outline-none text-lg tracking-wider"
                autoFocus
              />
            </div>

            {error && <p className="text-accent-red text-sm mb-3">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading || !phone}
              className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
          </div>
        )}

        {/* ── OTP STEP ── */}
        {step === 'otp' && (
          <div>
            <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }} className="flex items-center gap-1 text-gray-400 mb-5">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-white font-bold text-xl mb-1">Enter the code</h2>
            <p className="text-gray-400 text-sm mb-6">
              Sent to {countryCode} {phone}
            </p>

            {/* 6-digit OTP inputs */}
            <div className="flex gap-2 justify-between mb-6">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el }}
                  type="tel"
                  maxLength={6}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 text-center text-white text-xl font-bold bg-surface rounded-xl border border-surface-light focus:border-primary focus:outline-none"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && <p className="text-accent-red text-sm mb-3">{error}</p>}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.join('').length < 6}
              className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError('') }}
              className="w-full text-gray-400 text-sm mt-3 py-2"
            >
              Didn't get a code? Go back to resend
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
