import { useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/utils/cn'

interface TiltCardProps {
  children: ReactNode
  className?: string
  maxTilt?: number
  disabled?: boolean
}

export function TiltCard({ children, className, maxTilt = 7, disabled = false }: TiltCardProps) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 260,
    damping: 28,
  })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 260,
    damping: 28,
  })
  const [glare, setGlare] = useState({ x: 50, y: 0, opacity: 0 })
  const inactive = disabled || reduceMotion

  return (
    <div className={cn('[perspective:1200px]', className)}>
      <motion.div
        ref={ref}
        onPointerMove={(event) => {
          if (inactive || event.pointerType !== 'mouse') return
          const rect = ref.current?.getBoundingClientRect()
          if (!rect) return
          const px = (event.clientX - rect.left) / rect.width
          const py = (event.clientY - rect.top) / rect.height
          x.set(px - 0.5)
          y.set(py - 0.5)
          setGlare({ x: px * 100, y: py * 100, opacity: 0.5 })
        }}
        onPointerLeave={() => {
          x.set(0)
          y.set(0)
          setGlare((value) => ({ ...value, opacity: 0 }))
        }}
        style={inactive ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative"
      >
        {children}
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(340px circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,.13), transparent 52%)`,
          }}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  )
}
