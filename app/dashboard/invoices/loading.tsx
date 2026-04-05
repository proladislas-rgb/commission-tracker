export default function InvoicesLoading() {
  return (
    <div className="animate-pulse flex gap-4 h-[calc(100vh-80px)]">
      {/* Chat panel */}
      <div className="w-1/2 bg-surface rounded-[14px] border border-white/5 p-4 flex flex-col">
        <div className="h-6 w-48 bg-raised rounded mb-4" />
        <div className="flex-1 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-raised rounded-[8px]" />
          ))}
        </div>
        <div className="h-10 bg-raised rounded-[8px] mt-4" />
      </div>
      {/* Preview panel */}
      <div className="w-1/2 bg-surface rounded-[14px] border border-white/5 p-4">
        <div className="h-6 w-36 bg-raised rounded mb-4" />
        <div className="h-[500px] bg-raised rounded-[8px]" />
      </div>
    </div>
  )
}
