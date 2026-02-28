import { cn } from '@/lib/utils'

type WoStatus = 'open' | 'in_progress' | 'pending_parts' | 'closed'

const woStatusConfig: Record<WoStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
  pending_parts: { label: 'Pending Parts', className: 'bg-orange-100 text-orange-700' },
  closed: { label: 'Closed', className: 'bg-green-100 text-green-700' },
}

export function WoStatusBadge({ status }: { status: string }) {
  const config = woStatusConfig[status as WoStatus] ?? { label: status, className: 'bg-slate-100 text-slate-700' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}
