import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

const variantStyles = {
  default: 'text-foreground',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', className }: KpiCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-lg p-4 space-y-1', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-body">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className={cn('text-2xl font-semibold font-mono-display', variantStyles[variant])}>{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground font-body">{subtitle}</p>}
      {trend && (
        <p className={cn('text-xs', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
        </p>
      )}
    </div>
  )
}
