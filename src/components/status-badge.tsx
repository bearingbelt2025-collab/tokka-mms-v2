import { cn } from '@/lib/utils'

type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown'

const STATUS_CONFIG: Record<MachineStatus, { label: string; className: string }> = {
  running: { label: 'Running', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  idle: { label: 'Idle', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  maintenance: { label: 'Maintenance', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  breakdown: { label: 'Breakdown', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const config = STATUS_CONFIG[status as MachineStatus] ?? {
    label: status,
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
