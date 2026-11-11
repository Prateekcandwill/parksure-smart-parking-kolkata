import { PageHeader } from '@/components/layout/PageHeader'
import { AccountPanel } from '@/components/account/AccountPanel'

export default function AdminMePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Me"
        description="Administrator identity, assigned places, preferences and session controls."
      />
      <AccountPanel role="admin" />
    </div>
  )
}
