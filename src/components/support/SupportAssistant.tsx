import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageCircle, Sparkles } from 'lucide-react'
import type { Role } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SupportChat } from '@/components/support/SupportChat'
import { useT } from '@/i18n/useT'

/**
 * Global ParkSure Assist launcher.
 *
 * The same on-device chat is available from every workspace through this
 * floating button and from the dedicated `/{role}/support` route.
 */
export function SupportAssistant({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const t = useT()

  if (location.pathname === `/${role}/support`) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open ParkSure Assist support"
        className="focus-ring fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 items-center gap-2 rounded-full border border-accent/35 bg-accent px-4 text-sm font-semibold text-accent-ink shadow-[0_18px_44px_-18px_rgb(var(--accent)/.85)] transition-transform hover:scale-[1.03] active:scale-[0.98] sm:right-6"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent-ink/10">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <Sparkles
            className="absolute -right-1 -top-1 h-3 w-3 text-accent-ink"
            aria-hidden="true"
          />
        </span>
        <span className="hidden sm:inline">{t('nav.support', 'Assist')}</span>
        <span className="sm:hidden">Assist</span>
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="ParkSure Assist"
        description="On-device help for this demo. Answers come from a built-in library plus your live app state."
        size="full"
      >
        <SupportChat role={role} variant="sheet" />
      </BottomSheet>
    </>
  )
}
