export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div
        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'rgba(255,255,255,0.18)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}
