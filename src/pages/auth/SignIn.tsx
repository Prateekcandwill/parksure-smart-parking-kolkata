import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/Input'
import { OTPInput } from '@/components/ui/OTPInput'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { continueWithGoogle, requestOtp, signIn } from '@/api/auth'
import { identifierSchema, otpSchema, passwordSchema } from '@/utils/validation'
import { ROLE_META } from '@/utils/roles'
import { haptic } from '@/utils/haptics'
import { cn } from '@/utils/cn'
import { DEMO_CONFIG } from '@/config/env'
import { HoneypotField } from '@/components/security/Honeypot'
import { checkRateLimit, honeypotTripped, recordAttempt } from '@/utils/abuse'
import type { Role } from '@/types'

type Mode = 'otp' | 'password'
type Step = 'identifier' | 'secret'

const demoAccounts: Array<{ email: string; role: Role; name: string }> = [
  { email: 'driver@demo', role: 'driver', name: 'Aarav Mehta' },
  { email: 'attendant@demo', role: 'attendant', name: 'Ravi Kumar' },
  { email: 'operator@demo', role: 'operator', name: 'Meera Iyer' },
  { email: 'admin@demo', role: 'admin', name: 'Dev Malhotra' },
]

export default function SignInPage() {
  const navigate = useNavigate()
  const signInStore = useAuthStore((state) => state.signIn)
  const [mode, setMode] = useState<Mode>('otp')
  const [step, setStep] = useState<Step>('identifier')
  const [identifier, setIdentifier] = useState('')
  const [secret, setSecret] = useState('')
  const [destination, setDestination] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)
  const [honeypot, setHoneypot] = useState('')

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendIn])

  const changeMode = (next: Mode) => {
    setMode(next)
    setStep('identifier')
    setSecret('')
    setError(null)
    haptic('tap')
  }

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault()
    if (honeypotTripped(honeypot)) {
      setError('This form was flagged as automated. Reload the page and try again.')
      haptic('error')
      return
    }
    const limit = checkRateLimit('signin-otp', 5, 60_000)
    if (!limit.allowed) {
      setError(`Too many code requests. Try again in ${limit.retryInSeconds} seconds.`)
      haptic('error')
      return
    }
    const parsed = identifierSchema.safeParse(identifier)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid phone number or email.')
      haptic('error')
      return
    }
    recordAttempt('signin-otp')
    setSending(true)
    setError(null)
    try {
      const result = await requestOtp(identifier)
      setDestination(result.destination)
      setStep('secret')
      setSecret('')
      setResendIn(30)
      haptic('success')
      toast({ tone: 'info', title: 'Demo OTP sent', message: `Use ${DEMO_CONFIG.otp} to continue.` })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the code.')
      haptic('error')
    } finally {
      setSending(false)
    }
  }

  const continueToPassword = (event?: FormEvent) => {
    event?.preventDefault()
    const parsed = identifierSchema.safeParse(identifier)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid phone number or email.')
      haptic('error')
      return
    }
    setError(null)
    setStep('secret')
    setSecret('')
    haptic('tap')
  }

  const finish = async (value: string) => {
    if (submitting) return
    if (honeypotTripped(honeypot)) {
      setError('This form was flagged as automated. Reload the page and try again.')
      haptic('error')
      return
    }
    const limit = checkRateLimit('signin', 8, 60_000)
    if (!limit.allowed) {
      setError(`Too many sign-in attempts. Try again in ${limit.retryInSeconds} seconds.`)
      haptic('error')
      return
    }
    const schema = mode === 'otp' ? otpSchema : passwordSchema
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the code or password.')
      haptic('error')
      return
    }
    recordAttempt('signin')
    setSubmitting(true)
    setError(null)
    try {
      const user = await signIn({ identifier, method: mode, secret: value })
      signInStore(user.id, remember)
      haptic('success')
      toast({ tone: 'success', title: `Welcome, ${user.name.split(' ')[0]}`, message: 'Choose the workspace you need.' })
      navigate('/choose-role', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-in failed.')
      haptic('error')
      setSubmitting(false)
    }
  }

  const google = async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const user = await continueWithGoogle()
      signInStore(user.id, remember)
      haptic('success')
      toast({ tone: 'success', title: 'Signed in with the simulated Google account' })
      navigate('/choose-role', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in failed.')
      haptic('error')
      setGoogleLoading(false)
    }
  }

  const applyDemoAccount = (email: string) => {
    haptic('tap')
    setIdentifier(email)
    setMode('password')
    setStep('secret')
    setSecret(DEMO_CONFIG.password)
    setError(null)
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="label-caps">Unified sign in</span>
        </div>
        <h1 className="font-display text-[2.35rem] font-semibold leading-[1.02] tracking-tighter2 text-text">
          Park without
          <br />
          the wait.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          One account unlocks every parking role. Choose a workspace after sign-in.
        </p>
      </div>

      <Card strong className="p-5">
        <SegmentedControl
          ariaLabel="Sign-in method"
          value={mode}
          onChange={changeMode}
          options={[
            { value: 'otp', label: 'OTP', icon: <Smartphone className="h-3.5 w-3.5" /> },
            { value: 'password', label: 'Password', icon: <KeyRound className="h-3.5 w-3.5" /> },
          ]}
        />

        {step === 'identifier' ? (
          <form className="mt-5 space-y-4" onSubmit={mode === 'otp' ? sendCode : continueToPassword}>
            <TextField
              label="Phone or email"
              placeholder="driver@demo"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value)
                setError(null)
              }}
              icon={<Mail className="h-4 w-4" />}
              hint="Try driver@demo, attendant@demo, operator@demo or admin@demo."
              autoComplete="username"
              autoFocus
            />
            <HoneypotField value={honeypot} onChange={setHoneypot} />
            {error ? (
              <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs leading-relaxed text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={sending}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {mode === 'otp' ? 'Send demo OTP' : 'Continue'}
            </Button>
            <Switch
              checked={remember}
              onChange={setRemember}
              label="Remember this device"
              description="Keeps the demo session in local storage instead of this tab."
            />
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line/80 bg-raised/40 px-3 py-2.5">
              <div className="min-w-0">
                <div className="label-caps">Signing in as</div>
                <div className="mt-0.5 truncate font-mono text-xs font-semibold text-text">{identifier}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('identifier')
                  setSecret('')
                  setError(null)
                }}
                className="focus-ring inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-accent"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Change
              </button>
            </div>

            {mode === 'otp' ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold text-muted">One-time code</span>
                  <span className="text-[10px] text-muted">Sent to {destination}</span>
                </div>
                <OTPInput
                  value={secret}
                  onChange={(value) => {
                    setSecret(value)
                    setError(null)
                  }}
                  onComplete={finish}
                  error={error ?? undefined}
                  disabled={submitting}
                  label="Demo one-time code"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-muted">
                    Demo code <span className="font-mono font-semibold text-text">{DEMO_CONFIG.otp}</span>
                  </p>
                  <button
                    type="button"
                    disabled={resendIn > 0 || sending}
                    onClick={() => void sendCode()}
                    className="focus-ring min-h-10 rounded-lg px-2 text-[11px] font-semibold text-accent disabled:text-muted"
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  loading={submitting}
                  disabled={secret.length !== 6}
                  onClick={() => void finish(secret)}
                  iconLeft={<ShieldCheck className="h-4 w-4" />}
                >
                  Verify and continue
                </Button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void finish(secret)
                }}
              >
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={DEMO_CONFIG.password}
                  value={secret}
                  onChange={(event) => {
                    setSecret(event.target.value)
                    setError(null)
                  }}
                  icon={<LockKeyhole className="h-4 w-4" />}
                  hint={`Demo password: ${DEMO_CONFIG.password}`}
                  autoComplete="current-password"
                  autoFocus
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:text-text"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <HoneypotField value={honeypot} onChange={setHoneypot} />
                {error ? (
                  <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs leading-relaxed text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" size="lg" className="w-full" loading={submitting} iconRight={<ArrowRight className="h-4 w-4" />}>
                  Sign in
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="my-5 flex items-center gap-3">
          <span className="hairline flex-1" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">or</span>
          <span className="hairline flex-1" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          loading={googleLoading}
          onClick={() => void google()}
          iconLeft={
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[13px] font-bold text-[#4285F4]" aria-hidden="true">
              G
            </span>
          }
        >
          Continue with Google
        </Button>
        <p className="mt-2 text-center text-[10px] text-muted">Simulated Google account · driver@demo</p>
      </Card>

      <div className="mt-4 rounded-2xl border border-line/80 bg-surface/60 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-text">
          <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          Demo accounts
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => applyDemoAccount(account.email)}
              className={cn(
                'focus-ring min-h-11 rounded-xl border border-line/80 bg-raised/40 px-2.5 text-left text-[11px] transition-colors hover:border-accent/35',
              )}
            >
              <span className="block font-semibold text-text">{ROLE_META[account.role].label}</span>
              <span className="block truncate font-mono text-[10px] text-muted">{account.email}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">
          Tapping an account fills the password. OTP is always {DEMO_CONFIG.otp}. Admin@demo holds all four roles.
        </p>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        New driver?{' '}
        <Link to="/register" className="focus-ring font-semibold text-accent underline-offset-4 hover:underline">
          Create a driver account
        </Link>
      </p>
    </AuthLayout>
  )
}
