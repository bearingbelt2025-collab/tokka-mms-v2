import { Cog, AlertTriangle, CheckCircle2, WrenchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Machine, MachineStatus } from '@/types/database'

interface MachineCardProps {
  machine: Machine
  openWoCount: number
  onClick: () => void
}

const statusConfig: Record<MachineStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  running: { label: 'Running', color: 'text-emerald-400', icon: CheckCircle2 },
  maintenance_due: { label: 'Maint. Due', color: 'text-amber-400', icon: AlertTriangle },
  down: { label: 'Down', color: 'text-red-400', icon: AlertTriangle },
}

export function MachineCard({ machine, openWoCount, onClick }: MachineCardProps) {
  const cfg = statusConfig[machine.status]
  const StatusIcon = cfg.icon

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex gap-3">
        {machine.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={machine.photo_url}
            alt={machine.name}
            className="h-14 w-14 rounded-md object-cover border border-border shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-md bg-secondary flex items-center justify-center border border-border shrink-0">
            <Cog className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate font-body">{machine.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{machine.machine_type} · {machine.location}</p>

          <div className="flex items-center gap-1 mt-1.5">
            <StatusIcon className={cn('h-3 w-3', cfg.color)} />
            <span className={cn('text-xs font-mono-display', cfg.color)}>{cfg.label}</span>
          </div>
        </div>
      </div>

      {openWoCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 bg-amber-500/10 rounded-sm px-2 py-1">
          <WrenchIcon className="h-3 w-3 text-amber-400" />
          <span className="text-xs text-amber-400 font-body">{openWoCount} open work order{openWoCount !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}
