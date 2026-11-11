import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Car, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth'
import { toast } from '@/store/toast'
import { registerDriver } from '@/api/auth'
import { haptic } from '@/utils/haptics'
import { registrationSchema } from '@/utils/validation'
import { HoneypotField } from '@/components/security/Honeypot'
import { checkRateLimit, honeypotTripped, recordAttempt } from '@/utils/abuse'

export default function RegisterPage() {
  const navigate = useNavigate()
  const signInStore = useAuthStore((state) => state.signIn)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [plate, setPlate] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (honeypotTripped(honeypot)) {
      setError('This form was flagged as automated. Reload the page and try again.')
      haptic('error')
      return
    }
    const limit = checkRateLimit('register', 5, 5 * 60_000)
    if (!limit.allowed) {
      setError(`Too many registration attempts. Try again in ${limit.retryInSeconds} seconds.`)
      haptic('error')
      return
    }
    const parsed = registrationSchema.safeParse({ name, phone, plate, consent })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the registration details.')
      haptic('error')
      return
    }
    recordAttempt('register', 5 * 60_000)
    setLoading(true)
    setError(null)
    try {
      const { user } = await registerDriver(parsed.data)
      signInStore(user.id, true)
      haptic('success')
      toast({
        tone: 'success',
        title: 'Driver account created',
        message: 'Your plate and consent are stored in this browser only.',
      })
      navigate('/choose-role', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account.')
      haptic('error')
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="mb-5">
        <Link
          to="/sign-in"
          className="focus-ring mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl text-xs font-semibold text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="label-caps">Driver registration</span>
        </div>
        <h1 className="font-display text-[2.1rem] font-semibold leading-[1.04] tracking-tighter2 text-text">
          Create your driver account.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Staff accounts are created by an administrator. Driver accounts start with a vehicle and consent.
        </p>
      </div>

      <Card strong className="p-5">
        <form className="space-y-4" onSubmit={submit}>
          <TextField
            label="Full name"
            placeholder="Aarav Mehta"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            icon={<UserRound className="h-4 w-4" />}
            autoComplete="name"
            autoFocus
          />
          <TextField
            label="Mobile number"
            placeholder="9876500001"
            inputMode="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
              setError(null)
            }}
            icon={<Phone className="h-4 w-4" />}
            hint="Indian mobile numbers only in this demo."
            autoComplete="tel"
          />
          <TextField
            label="Vehicle plate"
            placeholder="WB 06 AB 1234"
            value={plate}
            onChange={(event) => {
              setPlate(event.target.value.toUpperCase())
              setError(null)
            }}
            icon={<Car className="h-4 w-4" />}
            hint="Format: state, district, series and four digits."
            autoComplete="off"
          />
          <Switch
            checked={consent}
            onChange={(value) => {
              setConsent(value)
              setError(null)
            }}
            label="Consent to demo data use"
            description="I consent to my plate, sessions and payment references being used to provide parking and receipts."
          />
          <HoneypotField value={honeypot} onChange={setHoneypot} />
          <div className="flex items-start gap-2 rounded-xl border border-line/80 bg-raised/40 p-3 text-[11px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            Data stays in this browser. No real SMS, email, map, gate or payment service is contacted.
          </div>
          {error ? (
            <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs leading-relaxed text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={!consent}
            iconRight={<ArrowRight className="h-4 w-4" />}
          >
            Create account
          </Button>
        </form>
      </Card>

      <p className="mt-5 text-center text-xs text-muted">
        Already registered?{' '}
        <Link to="/sign-in" className="focus-ring font-semibold text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
