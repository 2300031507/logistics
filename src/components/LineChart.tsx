import { useMemo } from 'react';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  confidenceUpper?: DataPoint[];
  confidenceLower?: DataPoint[];
}

export function LineChart({
  data,
  height = 300,
  color = '#3b82f6',
  showGrid = true,
  showPoints = false,
  confidenceUpper,
  confidenceLower
}: LineChartProps) {
  const { svgPath, confidencePath, minValue, maxValue, xPositions } = useMemo(() => {
    if (data.length === 0) return { svgPath: '', confidencePath: '', minValue: 0, maxValue: 0, xPositions: [] };

    const values = data.map(d => d.value);
    const minValue = Math.min(...values, ...(confidenceLower?.map(d => d.value) || []));
    const maxValue = Math.max(...values, ...(confidenceUpper?.map(d => d.value) || []));
    const range = maxValue - minValue || 1;

    const padding = 40;
    const width = 800;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const xPositions = data.map((_, i) => padding + (i / (data.length - 1)) * chartWidth);
    const yPositions = data.map(d => padding + chartHeight - ((d.value - minValue) / range) * chartHeight);

    const svgPath = `M ${xPositions.map((x, i) => `${x},${yPositions[i]}`).join(' L ')}`;

    let confidencePath = '';
    if (confidenceUpper && confidenceLower && confidenceUpper.length === data.length) {
      const upperY = confidenceUpper.map(d => padding + chartHeight - ((d.value - minValue) / range) * chartHeight);
      const lowerY = confidenceLower.map(d => padding + chartHeight - ((d.value - minValue) / range) * chartHeight);

      const upperPath = xPositions.map((x, i) => `${x},${upperY[i]}`).join(' L ');
      const lowerPath = xPositions.slice().reverse().map((x, i) => `${x},${lowerY[data.length - 1 - i]}`).join(' L ');

      confidencePath = `M ${upperPath} L ${lowerPath} Z`;
    }

    return { svgPath, confidencePath, minValue, maxValue, xPositions };
  }, [data, height, confidenceUpper, confidenceLower]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const width = 800;
  const padding = 40;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="text-gray-600">
        {showGrid && (
          <>
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
                    {Math.round(minValue + (maxValue - minValue) * ratio).toLocaleString()}
                  </text>
                </g>
              );
            })}
          </>
        )}

        {confidencePath && (
          <path
            d={confidencePath}
            fill={color}
            opacity="0.1"
          />
        )}

        <path
          d={svgPath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showPoints && data.map((point, i) => (
          <circle
            key={i}
            cx={xPositions[i]}
            cy={padding + (height - padding * 2) - ((point.value - minValue) / (maxValue - minValue || 1)) * (height - padding * 2)}
            r="4"
            fill={color}
          />
        ))}

        {data.map((point, i) => {
          if (i % Math.ceil(data.length / 8) !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={xPositions[i]}
              y={height - padding + 20}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
            >
              {new Date(point.date).toLocaleDateString('en', { month: 'short', year: '2-digit' })}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
