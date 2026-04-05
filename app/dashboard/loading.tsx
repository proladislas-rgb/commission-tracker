export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6 p-1">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-raised rounded-[8px]" />
        <div className="h-9 w-28 bg-raised rounded-[8px]" />
      </div>

      {/* KPI grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-[14px] border border-white/5 p-5 space-y-3">
            <div className="h-3 w-20 bg-raised rounded" />
            <div className="h-7 w-28 bg-raised rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-[14px] border border-white/5 p-5">
            <div className="h-4 w-32 bg-raised rounded mb-4" />
            <div className="h-48 bg-raised rounded-[8px]" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-surface rounded-[14px] border border-white/5 p-5 space-y-3">
        <div className="h-4 w-40 bg-raised rounded mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-4 w-24 bg-raised rounded" />
            <div className="h-4 w-32 bg-raised rounded" />
            <div className="h-4 w-20 bg-raised rounded" />
            <div className="h-4 flex-1 bg-raised rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
