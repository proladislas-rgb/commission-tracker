'use client'

interface ReemBubbleProps {
  onClick: () => void
  onHide: () => void
}

export default function ReemBubble({ onClick, onHide }: ReemBubbleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onHide() }}
      aria-label="Ouvrir Reem AI (clic-droit pour masquer)"
      title="Reem AI — clic pour ouvrir, clic-droit pour masquer"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(99,102,241,0.45), 0 0 0 4px rgba(99,102,241,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 40,
        transition: 'transform 200ms ease-out, box-shadow 200ms ease-out',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
      <span
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#22c55e',
          border: '2px solid #07080d',
        }}
      />
    </button>
  )
}
