import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  strong?: boolean
}

export function Card({ children, className, strong = false, ...props }: CardProps) {
  return (
    <div
      className={cn(strong ? 'surface-card-strong' : 'surface-card', className)}
      {...props}
    >
      {children}
    </div>
  )
}
