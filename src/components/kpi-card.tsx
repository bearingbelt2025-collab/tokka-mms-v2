import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, trendValue, className }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'

  return (
    <div className={cn('bg-card border border-border rounded-md p-4 flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground font-body uppercase tracking-wide">{title}</p>
        <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold font-mono-display">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground font-body mt-0.5">{subtitle}</p>}
      </div>
      {trend && trendValue && (
        <div className={cn('flex items-center gap-1', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span className="text-xs font-body">{trendValue}</span>
        </div>
      )}
    </div>
  )
}
