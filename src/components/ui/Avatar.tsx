import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

const tones = {
  gold: 'bg-accent/15 text-accent border-accent/25',
  violet: 'bg-violet/15 text-violet border-violet/25',
  green: 'bg-success/15 text-success border-success/25',
  blue: 'bg-info/15 text-info border-info/25',
}

interface AvatarProps {
  name: string
  tone?: keyof typeof tones
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, tone = 'gold', size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border font-display font-semibold',
        tones[tone],
        size === 'sm' && 'h-8 w-8 text-[10px]',
        size === 'md' && 'h-10 w-10 text-xs',
        size === 'lg' && 'h-14 w-14 text-base',
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}
