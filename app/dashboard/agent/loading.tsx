export default function AgentLoading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 80px)',
      margin: '-32px -16px',
      background: '#07080d',
    }}>
      {/* Header skeleton */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: '#0f1117',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: '10px',
          background: '#151a24',
          animation: 'agentPulse 1.5s ease-in-out infinite',
        }} />
        <div>
          <div style={{
            width: 80,
            height: 14,
            borderRadius: '6px',
            background: '#151a24',
            animation: 'agentPulse 1.5s ease-in-out infinite',
            marginBottom: 4,
          }} />
          <div style={{
            width: 160,
            height: 10,
            borderRadius: '4px',
            background: '#151a24',
            animation: 'agentPulse 1.5s ease-in-out infinite',
          }} />
        </div>
      </div>

      {/* Messages skeleton */}
      <div style={{
        flex: 1,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            flexDirection: i % 2 === 0 ? 'row' : 'row-reverse',
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: i % 2 === 0 ? '8px' : '50%',
              background: '#151a24',
              flexShrink: 0,
              animation: 'agentPulse 1.5s ease-in-out infinite',
            }} />
            <div style={{
              width: i % 2 === 0 ? '60%' : '40%',
              height: 60 + i * 20,
              borderRadius: '12px',
              background: '#151a24',
              animation: 'agentPulse 1.5s ease-in-out infinite',
            }} />
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: '#0f1117',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          flex: 1,
          height: 44,
          borderRadius: '10px',
          background: '#151a24',
          animation: 'agentPulse 1.5s ease-in-out infinite',
        }} />
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: '#151a24',
          animation: 'agentPulse 1.5s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes agentPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
