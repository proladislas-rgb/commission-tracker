export default function EmailLoading() {
  return (
    <div className="animate-pulse space-y-4 max-w-2xl">
      <div className="h-7 w-48 bg-raised rounded-[8px]" />
      <div className="bg-surface rounded-[14px] border border-white/5 p-6 space-y-4">
        <div className="h-10 bg-raised rounded-[8px]" />
        <div className="h-10 bg-raised rounded-[8px]" />
        <div className="h-40 bg-raised rounded-[8px]" />
        <div className="h-10 w-32 bg-raised rounded-[8px]" />
      </div>
    </div>
  )
}
