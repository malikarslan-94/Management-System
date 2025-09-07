import { ReactNode } from 'react'
import classNames from 'classnames'
import { HiTrendingUp, HiTrendingDown } from 'react-icons/hi'
import Card from '@/components/ui/Card'

interface StatisticProps {
  title: string
  value: number | string
  icon: ReactNode
  color?: 'indigo' | 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'pink' | 'gray'
  trend?: 'up' | 'down'
  trendValue?: string | number
  className?: string
}

const Statistic = (props: StatisticProps) => {
  const {
    title,
    value,
    icon,
    color = 'indigo',
    trend,
    trendValue,
    className
  } = props

  const colors = {
    bg: {
      indigo: 'bg-indigo-50 dark:bg-indigo-500/10',
      blue: 'bg-blue-50 dark:bg-blue-500/10',
      emerald: 'bg-emerald-50 dark:bg-emerald-500/10',
      amber: 'bg-amber-50 dark:bg-amber-500/10',
      red: 'bg-red-50 dark:bg-red-500/10',
      purple: 'bg-purple-50 dark:bg-purple-500/10',
      pink: 'bg-pink-50 dark:bg-pink-500/10',
      gray: 'bg-gray-50 dark:bg-gray-700',
    },
    text: {
      indigo: 'text-indigo-600 dark:text-indigo-400',
      blue: 'text-blue-600 dark:text-blue-400',
      emerald: 'text-emerald-600 dark:text-emerald-400',
      amber: 'text-amber-600 dark:text-amber-400',
      red: 'text-red-600 dark:text-red-400',
      purple: 'text-purple-600 dark:text-purple-400',
      pink: 'text-pink-600 dark:text-pink-400',
      gray: 'text-gray-600 dark:text-gray-200',
    },
    iconBg: {
      indigo: 'bg-indigo-100 dark:bg-indigo-500/20',
      blue: 'bg-blue-100 dark:bg-blue-500/20',
      emerald: 'bg-emerald-100 dark:bg-emerald-500/20',
      amber: 'bg-amber-100 dark:bg-amber-500/20',
      red: 'bg-red-100 dark:bg-red-500/20',
      purple: 'bg-purple-100 dark:bg-purple-500/20',
      pink: 'bg-pink-100 dark:bg-pink-500/20',
      gray: 'bg-gray-100 dark:bg-gray-600',
    },
  }

  return (
    <Card className={classNames('h-full', className)}>
      <div className="flex items-center justify-between h-full">
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </h4>
          <div className="flex items-center">
            <span className={classNames('text-2xl font-semibold', colors.text[color])}>
              {value}
            </span>
            {trend && trendValue && (
              <span
                className={classNames(
                  'ml-2 flex items-center text-xs font-medium',
                  trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend === 'up' ? (
                  <HiTrendingUp className="mr-0.5" />
                ) : (
                  <HiTrendingDown className="mr-0.5" />
                )}
                {trendValue}
              </span>
            )}
          </div>
        </div>
        <div
          className={classNames(
            'p-3 rounded-lg',
            colors.iconBg[color]
          )}
        >
          <div className={classNames('text-xl', colors.text[color])}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default Statistic
