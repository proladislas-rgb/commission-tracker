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
            'w-full bg-[rgba(0,0,0,0.30)] border rounded-[12px] px-3 py-2 text-sm text-lg-text',
            'placeholder:text-lg-muted/60 outline-none transition-all duration-150',
            'focus:border-lg-accent-1 focus:ring-[3px] focus:ring-lg-accent-1/25',
            error
              ? 'border-lg-danger/50 focus:border-lg-danger focus:ring-lg-danger/20'
              : 'border-[rgba(255,255,255,0.10)]',
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
