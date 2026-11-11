import { PageHeader } from '@/components/layout/PageHeader'
import { AccountPanel } from '@/components/account/AccountPanel'

export default function OperatorMePage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Me"
        description="Operator identity, assigned places, preferences and session controls."
      />
      <AccountPanel role="operator" />
    </div>
  )
}
