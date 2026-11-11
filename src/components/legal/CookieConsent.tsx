import { Link } from 'react-router-dom'
import { Cookie, ShieldCheck } from 'lucide-react'
import { useConsentStore } from '@/store/consent'
import { toast } from '@/store/toast'
import { Button } from '@/components/ui/Button'
import { haptic } from '@/utils/haptics'

export function CookieConsent() {
  const decidedAt = useConsentStore((state) => state.decidedAt)
  const acceptAll = useConsentStore((state) => state.acceptAll)
  const essentialOnly = useConsentStore((state) => state.essentialOnly)

  if (decidedAt) return null

  return (
    <div
      role="region"
      aria-label="Privacy and analytics choices"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
    >
      <div className="glass pointer-events-auto mx-auto w-full max-w-3xl rounded-[24px] border border-line/90 p-4 shadow-[0_-18px_60px_-28px_rgba(0,0,0,.9)] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-accent">
            <Cookie className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text">Your privacy choices</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              ParkSure uses local storage for sign-in, preferences and the demo database. Optional usage analytics stay
              on this device and are off until you opt in. There are no advertising cookies or third-party trackers.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  haptic('tap')
                  acceptAll()
                  toast({
                    tone: 'success',
                    title: 'Privacy choice saved',
                    message: 'Optional local analytics are on. Change this any time in Me.',
                  })
                }}
                iconLeft={<ShieldCheck className="h-4 w-4" />}
              >
                Accept all
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  haptic('tap')
                  essentialOnly()
                  toast({
                    tone: 'success',
                    title: 'Privacy choice saved',
                    message: 'Only essential local storage is used. Analytics stay off.',
                  })
                }}
              >
                Essential only
              </Button>
              <Link
                to="/privacy"
                className="focus-ring inline-flex min-h-10 items-center rounded-lg px-2 text-[11px] font-semibold text-accent underline-offset-4 hover:underline"
              >
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
