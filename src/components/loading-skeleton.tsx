import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
}

function SkeletonBlock({ className }: LoadingSkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  )
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-card border border-border border-l-4 border-l-muted rounded-md p-4 flex items-center gap-4">
      <SkeletonBlock className="h-10 w-10 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-24" />
        <SkeletonBlock className="h-7 w-16" />
      </div>
    </div>
  )
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-card border border-border rounded-md p-4 space-y-3">
      <SkeletonBlock className="h-4 w-3/4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBlock key={i} className={cn('h-3', i === lines - 2 ? 'w-1/2' : 'w-full')} />
      ))}
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={cn('h-4', i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'flex-1')}
        />
      ))}
    </div>
  )
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={4} />
      ))}
    </div>
  )
}
