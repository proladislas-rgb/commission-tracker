'use client'

import { SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full bg-raised border rounded-btn px-3 py-2 text-sm text-txt',
            'outline-none transition-all duration-150 cursor-pointer',
            'focus:border-indigo focus:ring-1 focus:ring-indigo/30',
            error
              ? 'border-rose/50'
              : 'border-[rgba(255,255,255,0.1)]',
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-surface">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-rose">{error}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'
export default Select
