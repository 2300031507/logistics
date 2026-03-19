import { useMemo } from 'react';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  horizontal?: boolean;
}

export function BarChart({ data, height = 300, horizontal = false }: BarChartProps) {
  const { bars, maxValue } = useMemo(() => {
    if (data.length === 0) return { bars: [], maxValue: 0 };

    const maxValue = Math.max(...data.map(d => d.value));

    return { bars: data, maxValue };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const width = 800;
  const padding = 60;

  if (horizontal) {
    return (
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="text-gray-600">
          {bars.map((bar, i) => {
            const barHeight = 30;
            const barSpacing = (height - padding * 2) / bars.length;
            const y = padding + i * barSpacing;
            const barWidth = ((bar.value / maxValue) * (width - padding * 2 - 100)) || 0;

            return (
              <g key={i}>
                <text
                  x={padding - 10}
                  y={y + barHeight / 2 + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="currentColor"
                >
                  {bar.label}
                </text>
                <rect
                  x={padding}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={bar.color || '#3b82f6'}
                  rx="4"
                />
                <text
                  x={padding + barWidth + 10}
                  y={y + barHeight / 2 + 4}
                  fontSize="12"
                  fill="currentColor"
                >
                  {bar.value.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="text-gray-600">
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding + (height - padding * 2) * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="12" fill="currentColor">
                {Math.round(maxValue * ratio).toLocaleString()}
              </text>
            </g>
          );
        })}

        {bars.map((bar, i) => {
          const barWidth = Math.max(20, (width - padding * 2) / bars.length - 10);
          const x = padding + i * ((width - padding * 2) / bars.length);
          const barHeight = ((bar.value / maxValue) * (height - padding * 2)) || 0;
          const y = padding + (height - padding * 2) - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={bar.color || '#3b82f6'}
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={height - padding + 15}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
              >
                {bar.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fontSize="11"
                fill="currentColor"
                fontWeight="600"
              >
                {bar.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
