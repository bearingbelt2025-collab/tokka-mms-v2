import { cn } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-secondary', className)} />
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex gap-3">
            <Skeleton className="h-14 w-14 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-10 rounded-sm" />
              <Skeleton className="h-5 w-12 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  )
}
