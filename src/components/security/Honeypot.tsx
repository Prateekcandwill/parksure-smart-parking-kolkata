import { useId } from 'react'

interface HoneypotFieldProps {
  value: string
  onChange: (value: string) => void
  /** Field name that bots tend to fill in. */
  name?: string
}

/**
 * Visually hidden field that real users never see or focus. Bots that fill
 * every input trip it. `aria-hidden` plus `tabIndex={-1}` keeps it out of the
 * accessibility tree and keyboard order.
 */
export function HoneypotField({ value, onChange, name = 'website' }: HoneypotFieldProps) {
  const id = useId()
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={id}>Leave this field empty</label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  )
}
