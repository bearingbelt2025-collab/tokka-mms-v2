import { cn } from '@/lib/utils'
import type { WorkOrderStatus } from '@/types/database'

const WO_STATUS_CONFIG: Record<WorkOrderStatus, { label: string; bg: string; text: string }> = {
  open: { label: 'Open', bg: 'bg-slate-500/20', text: 'text-slate-300' },
  assigned: { label: 'Assigned', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
}

interface WoStatusBadgeProps {
  status: WorkOrderStatus
  className?: string
}

export function WoStatusBadge({ status, className }: WoStatusBadgeProps) {
  const config = WO_STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium font-body',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label}
    </span>
  )
}
