import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'currency' | 'percent' | 'number';
  trend?: 'up' | 'down' | 'neutral';
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  format = 'number',
  trend
}: MetricCardProps) {
  const formattedValue = typeof value === 'number'
    ? format === 'currency'
      ? `$${value.toLocaleString()}`
      : format === 'percent'
      ? `${value.toFixed(2)}%`
      : value.toLocaleString()
    : value;

  const determinedTrend = trend || (change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral');

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500'
  };

  const TrendIcon = determinedTrend === 'up' ? TrendingUp : determinedTrend === 'down' ? TrendingDown : Minus;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{formattedValue}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2 gap-1">
              <TrendIcon className={`w-4 h-4 ${trendColors[determinedTrend]}`} />
              <span className={`text-sm font-medium ${trendColors[determinedTrend]}`}>
                {change > 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
              {changeLabel && <span className="text-sm text-gray-500 ml-1">{changeLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-blue-50 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
