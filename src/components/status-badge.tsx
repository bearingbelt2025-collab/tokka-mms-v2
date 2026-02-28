import { cn } from '@/lib/utils'

type Status = 'running' | 'maintenance_due' | 'breakdown'

const statusConfig: Record<Status, { label: string; className: string }> = {
  running: { label: 'Running', className: 'bg-green-100 text-green-800' },
  maintenance_due: { label: 'Maintenance Due', className: 'bg-yellow-100 text-yellow-800' },
  breakdown: { label: 'Breakdown', className: 'bg-red-100 text-red-800' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as Status] ?? { label: status, className: 'bg-slate-100 text-slate-800' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
