import { cn } from '@/lib/utils'
import type { WorkOrderStatus } from '@/types/database'

interface WoStatusBadgeProps {
  status: WorkOrderStatus
  className?: string
}

const config: Record<WorkOrderStatus, { label: string; classes: string }> = {
  open: { label: 'Open', classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  in_progress: { label: 'In Progress', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  pending_parts: { label: 'Pend. Parts', classes: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  completed: { label: 'Done', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
}

export function WoStatusBadge({ status, className }: WoStatusBadgeProps) {
  const cfg = config[status]
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
