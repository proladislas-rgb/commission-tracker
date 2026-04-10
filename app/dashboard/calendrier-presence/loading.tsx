export default function CalendrierPresenceLoading() {
  return (
    <>
      <div className="mb-6">
        <div className="h-7 w-64 bg-raised rounded-btn skeleton mb-2" />
        <div className="h-4 w-48 bg-raised rounded-btn skeleton" />
      </div>
      <div className="bg-surface border border-border rounded-card p-6 mb-6" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <div className="h-9 w-full bg-raised rounded-btn skeleton mb-6" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-raised rounded-[10px] skeleton" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-card p-5 h-32 skeleton" />
        ))}
      </div>
    </>
  )
}
