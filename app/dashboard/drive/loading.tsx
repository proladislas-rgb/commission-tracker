export default function DriveLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-raised rounded-[8px]" />
        <div className="h-9 w-28 bg-raised rounded-[8px]" />
      </div>
      <div className="bg-surface rounded-[14px] border border-white/5 p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="w-8 h-8 bg-raised rounded" />
            <div className="flex-1 h-4 bg-raised rounded" />
            <div className="w-20 h-3 bg-raised rounded" />
            <div className="w-16 h-3 bg-raised rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
