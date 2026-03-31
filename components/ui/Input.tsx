'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-[10px] uppercase tracking-[0.9px] text-txt2 font-medium">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-raised border rounded-btn px-3 py-2 text-sm text-txt',
            'placeholder:text-txt3 outline-none transition-all duration-150',
            'focus:border-indigo focus:ring-1 focus:ring-indigo/30',
            error
              ? 'border-rose/50 focus:border-rose focus:ring-rose/20'
              : 'border-[rgba(255,255,255,0.1)]',
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-rose">{error}</span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
export default Input
