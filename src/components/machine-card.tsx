import { cn } from '@/lib/utils'
import { Cog } from 'lucide-react'
import { StatusBadge } from './status-badge'
import type { Machine } from '@/types/database'

interface MachineCardProps {
  machine: Machine
  onClick?: () => void
  openWoCount?: number
  compact?: boolean
}

const STATUS_BORDER: Record<Machine['status'], string> = {
  running: 'border-emerald-500/40 hover:border-emerald-500/70',
  maintenance_due: 'border-amber-500/40 hover:border-amber-500/70',
  breakdown: 'border-red-500/40 hover:border-red-500/70',
}

const STATUS_DOT: Record<Machine['status'], string> = {
  running: 'bg-emerald-500',
  maintenance_due: 'bg-amber-500',
  breakdown: 'bg-red-500',
}

export function MachineCard({ machine, onClick, openWoCount, compact = false }: MachineCardProps) {
  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'bg-card border rounded-md p-3 cursor-pointer transition-all duration-150',
          STATUS_BORDER[machine.status]
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold font-mono-display truncate leading-tight">{machine.name}</p>
            <p className="text-xs text-muted-foreground truncate">{machine.location}</p>
          </div>
          <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1', STATUS_DOT[machine.status])} />
        </div>
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          {machine.status.replace('_', ' ')}
        </p>
      </div>
    )
  }

  const specs = machine.specs as Record<string, string> | null

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border rounded-md p-4 cursor-pointer transition-all duration-150 flex flex-col gap-3',
        STATUS_BORDER[machine.status]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {machine.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={machine.photo_url}
              alt={machine.name}
              className="h-10 w-10 rounded-md object-cover shrink-0 border border-border"
            />
          ) : (
            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Cog className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold font-mono-display text-sm leading-tight truncate">{machine.name}</p>
            <p className="text-xs text-muted-foreground truncate">{machine.machine_type}</p>
          </div>
        </div>
        <StatusBadge status={machine.status} size="sm" className="shrink-0" />
      </div>

      {/* Details */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1">
          <span className="text-foreground/60">Location:</span>
          <span className="font-medium text-foreground">{machine.location}</span>
        </p>
        {specs?.capacity && (
          <p className="flex items-center gap-1">
            <span className="text-foreground/60">Capacity:</span>
            <span className="font-medium text-foreground">{specs.capacity}</span>
          </p>
        )}
        {specs?.power && (
          <p className="flex items-center gap-1">
            <span className="text-foreground/60">Power:</span>
            <span className="font-medium text-foreground">{specs.power}</span>
          </p>
        )}
      </div>

      {/* Footer */}
      {openWoCount !== undefined && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Open Work Orders</span>
          <span
            className={cn(
              'text-xs font-mono-display font-bold px-1.5 py-0.5 rounded-sm',
              openWoCount > 0
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/10 text-emerald-400'
            )}
          >
            {openWoCount}
          </span>
        </div>
      )}
    </div>
  )
}
