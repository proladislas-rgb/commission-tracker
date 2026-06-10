/**
 * Nappes lumineuses fixes du design Liquid Glass.
 * Statiques (jamais animées) et pointer-events:none — coût GPU rendu une seule fois.
 */
export default function GlassBackdrop() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -120, left: '10%', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(106,92,255,.26), transparent 65%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', top: '30%', right: -140, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,.18), transparent 65%)', filter: 'blur(40px)' }} />
      <div style={{ position: 'absolute', bottom: -160, left: -100, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,.12), transparent 65%)', filter: 'blur(40px)' }} />
    </div>
  )
}
