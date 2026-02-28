import { cn } from '@/lib/utils'
import type { WorkOrderPriority } from '@/types/database'

const PRIORITY_CONFIG: Record<WorkOrderPriority, { label: string; bg: string; text: string }> = {
  low: { label: 'Low', bg: 'bg-slate-500/20', text: 'text-slate-300' },
  medium: { label: 'Medium', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  high: { label: 'High', bg: 'bg-amber-500/20', text: 'text-amber-400' },
  critical: { label: 'Critical', bg: 'bg-red-500/20', text: 'text-red-400' },
}

interface PriorityBadgeProps {
  priority: WorkOrderPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium font-mono-display',
        config.bg,
        config.text,
        className
      )}
    >
      {config.label.toUpperCase()}
    </span>
  )
}
