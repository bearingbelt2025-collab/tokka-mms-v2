import { cn } from '@/lib/utils'

type Priority = 'low' | 'medium' | 'high' | 'critical'

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  medium: { label: 'Medium', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  high: { label: 'High', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  critical: { label: 'Critical', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function PriorityBadge({ priority, size = 'md' }: { priority: string; size?: 'sm' | 'md' }) {
  const config = PRIORITY_CONFIG[priority as Priority] ?? {
    label: priority,
    className: 'bg-secondary text-muted-foreground border-border',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border font-body font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
