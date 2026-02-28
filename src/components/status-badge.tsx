import { cn } from '@/lib/utils'
import type { MachineStatus } from '@/types/database'

interface StatusBadgeProps {
  status: MachineStatus
  size?: 'sm' | 'md'
  className?: string
}

const config: Record<MachineStatus, { label: string; classes: string }> = {
  running: { label: 'Running', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  maintenance_due: { label: 'Maint. Due', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  down: { label: 'Down', classes: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const cfg = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border font-mono-display uppercase tracking-wide',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        cfg.classes,
        className
      )}
    >
      {cfg.label}
    </span>
  )
}
