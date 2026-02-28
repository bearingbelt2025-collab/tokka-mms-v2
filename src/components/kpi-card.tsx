import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Color = 'blue' | 'orange' | 'red' | 'purple' | 'green'

const colorMap: Record<Color, { bg: string; icon: string; value: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', value: 'text-blue-700' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', value: 'text-orange-700' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', value: 'text-red-700' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', value: 'text-purple-700' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', value: 'text-green-700' },
}

export function KpiCard({
  title,
  value,
  icon,
  color = 'blue',
}: {
  title: string
  value: number
  icon: React.ReactNode
  color?: Color
}) {
  const colors = colorMap[color]
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{title}</p>
            <p className={cn('text-2xl font-bold mt-1', colors.value)}>{value}</p>
          </div>
          <div className={cn('p-2.5 rounded-lg', colors.bg)}>
            <span className={colors.icon}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
