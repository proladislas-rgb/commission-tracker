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
  primary:   'text-white lg-shadow-accent active:scale-[0.98]',
  secondary: 'bg-[rgba(255,255,255,0.07)] text-lg-text border border-[rgba(255,255,255,0.11)] hover:bg-[rgba(255,255,255,0.10)]',
  ghost:     'bg-transparent text-lg-muted hover:text-lg-text hover:bg-[rgba(255,255,255,0.06)]',
  danger:    'bg-[rgba(255,99,105,0.13)] text-lg-danger border border-[rgba(255,99,105,0.22)] hover:bg-[rgba(255,99,105,0.20)]',
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
        'inline-flex items-center gap-2 rounded-full font-semibold lg-ease cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      style={variant === 'primary' ? { background: 'linear-gradient(135deg, #6a5cff, #3b82f6)', ...(props.style ?? {}) } : props.style}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
