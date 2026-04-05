export default function ClientsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-raised rounded-[8px]" />
        <div className="h-9 w-36 bg-raised rounded-[8px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-[14px] border border-white/5 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-raised rounded-full" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 bg-raised rounded" />
                <div className="h-3 w-24 bg-raised rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-raised rounded" />
            <div className="h-3 w-3/4 bg-raised rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
