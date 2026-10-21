export default function Loading() {
  return (
    <div className="min-h-svh w-full animate-pulse bg-background">
      <div className="hidden h-full w-[248px] bg-sidebar lg:block" />
      <div className="space-y-4 p-6 lg:ml-[248px]">
        <div className="h-10 w-56 rounded-lg bg-muted" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-14 min-w-[8rem] flex-1 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-72 w-full rounded-lg bg-muted" />
      </div>
    </div>
  );
}
