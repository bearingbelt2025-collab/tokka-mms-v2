import { cn } from '@/lib/utils'
import type { WorkOrderPriority } from '@/types/database'

interface PriorityBadgeProps {
  priority: WorkOrderPriority
  className?: string
}

const config: Record<WorkOrderPriority, { label: string; classes: string }> = {
  low: { label: 'Low', classes: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  medium: { label: 'Med', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  high: { label: 'High', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  critical: { label: 'CRIT', classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const cfg = config[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border text-[10px] font-mono-display uppercase tracking-wide px-1.5 py-0.5',
        cfg.classes,
        className
      )}
    >
      {cfg.label}
    </span>
  )
}
