'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-indigo text-white hover:bg-indigo2 active:scale-[0.98]',
  secondary: 'bg-raised text-txt border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.08)]',
  ghost:     'bg-transparent text-txt2 hover:text-txt hover:bg-[rgba(255,255,255,0.05)]',
  danger:    'bg-rose/10 text-rose border border-rose/30 hover:bg-rose/20',
}

const sizeClasses: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-xs',
  md:  'px-4 py-2 text-sm',
  lg:  'px-5 py-2.5 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 rounded-btn font-medium transition-all duration-150 cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
