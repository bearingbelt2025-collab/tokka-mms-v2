import { cn } from '@/lib/utils'
import type { MachineStatus } from '@/types/database'

const STATUS_CONFIG: Record<MachineStatus, { label: string; dot: string; text: string; bg: string }> = {
  running: {
    label: 'Running',
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  maintenance_due: {
    label: 'Maintenance Due',
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  breakdown: {
    label: 'Breakdown',
    dot: 'bg-red-500',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
  },
}

interface StatusBadgeProps {
  status: MachineStatus
  size?: 'sm' | 'md'
  className?: string
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm font-body font-medium',
        config.bg,
        config.text,
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        className
      )}
    >
      <span className={cn('rounded-full shrink-0', config.dot, size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      {config.label}
    </span>
  )
}
