import { cn } from '@/lib/utils'

type WoStatus = 'open' | 'in_progress' | 'pending_parts' | 'completed' | 'cancelled'

const WO_STATUS_CONFIG: Record<WoStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  pending_parts: { label: 'Pending Parts', className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
}

export function WoStatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const config = WO_STATUS_CONFIG[status as WoStatus] ?? {
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
