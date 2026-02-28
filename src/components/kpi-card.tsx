import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  accentColor: 'green' | 'amber' | 'red' | 'blue'
  subtitle?: string
  className?: string
}

const ACCENT_STYLES = {
  green: {
    border: 'border-l-emerald-500',
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
  },
  amber: {
    border: 'border-l-amber-500',
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
  },
  red: {
    border: 'border-l-red-500',
    icon: 'text-red-400',
    iconBg: 'bg-red-500/10',
  },
  blue: {
    border: 'border-l-blue-500',
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
}

export function KpiCard({ title, value, icon: Icon, accentColor, subtitle, className }: KpiCardProps) {
  const styles = ACCENT_STYLES[accentColor]
  return (
    <div
      className={cn(
        'bg-card border border-border border-l-4 rounded-md p-4 flex items-center gap-4',
        styles.border,
        className
      )}
    >
      <div className={cn('p-2.5 rounded-md shrink-0', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wide truncate">{title}</p>
        <p className={cn('text-2xl font-bold font-mono-display leading-tight')}>{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground font-body mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
