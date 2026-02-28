import { cn } from '@/lib/utils'

type Priority = 'low' | 'medium' | 'high' | 'critical'

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 font-semibold' },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority as Priority] ?? { label: priority, className: 'bg-slate-100 text-slate-700' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
