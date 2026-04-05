'use client'

interface ErrorAlertProps {
  message: string
  onRetry?: () => void
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="bg-rose/10 border border-rose/20 rounded-[8px] px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-rose flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="text-rose text-sm flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-rose text-sm font-medium hover:underline flex-shrink-0"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
