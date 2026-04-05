export default function ChatLoading() {
  return (
    <div className="animate-pulse flex h-[calc(100vh-80px)] gap-4">
      {/* Sidebar channels */}
      <div className="w-64 bg-surface rounded-[14px] border border-white/5 p-4 space-y-3 hidden lg:block">
        <div className="h-4 w-24 bg-raised rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-raised rounded-[8px]" />
        ))}
      </div>
      {/* Main chat area */}
      <div className="flex-1 bg-surface rounded-[14px] border border-white/5 p-4 flex flex-col">
        <div className="h-6 w-40 bg-raised rounded mb-4" />
        <div className="flex-1 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'justify-end'}`}>
              <div className="w-8 h-8 bg-raised rounded-full flex-shrink-0" />
              <div className="space-y-1.5 max-w-xs">
                <div className="h-3 w-20 bg-raised rounded" />
                <div className="h-12 w-48 bg-raised rounded-[8px]" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-10 bg-raised rounded-[8px] mt-4" />
      </div>
    </div>
  )
}
