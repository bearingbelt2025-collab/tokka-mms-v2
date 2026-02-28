import { cn } from '@/lib/utils'
import { StatusBadge } from './status-badge'
import { Cog, MapPin, Calendar, Wrench } from 'lucide-react'
import type { Machine } from '@/types/database'

interface MachineCardProps {
  machine: Machine
  onClick?: () => void
}

export function MachineCard({ machine, onClick }: MachineCardProps) {
  const specs = machine.specs as Record<string, string> | null

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-md overflow-hidden transition-all duration-100',
        onClick && 'cursor-pointer hover:border-primary/40 hover:bg-card/80'
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-36 bg-muted">
        {machine.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={machine.photo_url}
            alt={machine.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Cog className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusBadge status={machine.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-semibold font-mono-display text-sm truncate">{machine.name}</h3>
          <p className="text-xs text-muted-foreground font-body">{machine.machine_type}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="font-body truncate">{machine.location}</span>
          </div>
          {machine.installed_date && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="font-body">
                {new Date(machine.installed_date).getFullYear()}
              </span>
            </div>
          )}
        </div>

        {specs && Object.keys(specs).length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex flex-wrap gap-1">
              {Object.entries(specs)
                .slice(0, 3)
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] px-1.5 py-0.5 bg-secondary rounded-sm font-body text-muted-foreground"
                  >
                    {v}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
