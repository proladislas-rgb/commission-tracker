'use client'

interface ReemPullTabProps {
  onClick: () => void
}

export default function ReemPullTab({ onClick }: ReemPullTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Ressortir Reem AI"
      title="Ressortir Reem AI"
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '22px',
        height: '60px',
        background: 'rgba(99,102,241,0.18)',
        borderTop: '1px solid rgba(99,102,241,0.4)',
        borderLeft: '1px solid rgba(99,102,241,0.4)',
        borderBottom: '1px solid rgba(99,102,241,0.4)',
        borderRight: 'none',
        borderTopLeftRadius: '8px',
        borderBottomLeftRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        zIndex: 40,
        color: '#818cf8',
        transition: 'background-color 150ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.28)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.18)' }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>R</span>
    </button>
  )
}
