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
            'w-full bg-[rgba(0,0,0,0.30)] border rounded-[12px] px-3 py-2 text-sm text-lg-text',
            'outline-none transition-all duration-150 cursor-pointer',
            'focus:border-lg-accent-1 focus:ring-[3px] focus:ring-lg-accent-1/25',
            error
              ? 'border-lg-danger/50'
              : 'border-[rgba(255,255,255,0.10)]',
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#15151c]">
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
