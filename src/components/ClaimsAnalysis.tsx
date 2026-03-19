import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MetricCard } from './MetricCard';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { AlertTriangle, TrendingUp, Cloud, Activity } from 'lucide-react';
import { forecastTimeSeries, type TimeSeriesPoint } from '../lib/analytics';
import { isDateInWindow, matchesRegion, type TimeWindow } from '../lib/filters';

interface ClaimsMetrics {
  totalClaims: number;
  averageClaimSize: number;
  weatherRelatedPercent: number;
  claimFrequency: number;
  claimsTrend: TimeSeriesPoint[];
  forecast: TimeSeriesPoint[];
  confidenceUpper: TimeSeriesPoint[];
  confidenceLower: TimeSeriesPoint[];
  claimsBySeverity: Array<{ label: string; value: number; color: string }>;
  claimsByRegion: Array<{ label: string; value: number }>;
  forecastTrend: 'increasing' | 'decreasing' | 'stable';
}

interface ClaimRow {
  claim_amount: number;
  claim_date: string;
  severity: string;
  region: string;
  weather_related: boolean;
  status: string;
}

interface ClaimsAnalysisProps {
  regionFilter: string;
  timeWindow: TimeWindow;
  refreshKey: number;
}

export function ClaimsAnalysis({ regionFilter, timeWindow, refreshKey }: ClaimsAnalysisProps) {
  const [metrics, setMetrics] = useState<ClaimsMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaimsData();
  }, [regionFilter, timeWindow, refreshKey]);

  async function loadClaimsData() {
    try {
      const { data: claims, error } = await supabase
        .from('claims')
        .select('claim_amount, claim_date, severity, region, weather_related, status');

      if (error) throw error;
      if (!claims) throw new Error('No claims data');

      const allClaims = (claims || []) as ClaimRow[];

      const filteredClaims = allClaims.filter(
        c => matchesRegion(c.region ?? 'Unknown', regionFilter) && isDateInWindow(c.claim_date, timeWindow)
      );

      const paidClaims = filteredClaims.filter(c => c.status === 'paid');

      const totalClaims = paidClaims.length;
      const totalAmount = paidClaims.reduce((sum, c) => sum + Number(c.claim_amount), 0);
      const averageClaimSize = totalClaims > 0 ? totalAmount / totalClaims : 0;
      const weatherRelated = paidClaims.filter(c => c.weather_related).length;
      const weatherRelatedPercent = totalClaims > 0 ? (weatherRelated / totalClaims) * 100 : 0;

      const claimsByMonth = paidClaims.reduce((acc, c) => {
        const month = c.claim_date.substring(0, 7);
        if (!acc[month]) {
          acc[month] = { count: 0, amount: 0 };
        }
        acc[month].count++;
        acc[month].amount += Number(c.claim_amount);
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);

      const months = Object.keys(claimsByMonth).sort();
      const claimsTrend = months.map(month => ({
        date: `${month}-01`,
        value: claimsByMonth[month].amount
      }));

      const prediction = claimsTrend.length >= 2
        ? forecastTimeSeries(claimsTrend, 6)
        : {
            forecast: [],
            confidenceUpper: [],
            confidenceLower: [],
            trend: 'stable' as const,
            changePercent: 0
          };

      const claimsBySeverity = [
        { label: 'Minor', value: paidClaims.filter(c => c.severity === 'minor').length, color: '#10b981' },
        { label: 'Moderate', value: paidClaims.filter(c => c.severity === 'moderate').length, color: '#f59e0b' },
        { label: 'Severe', value: paidClaims.filter(c => c.severity === 'severe').length, color: '#ef4444' },
        { label: 'Catastrophic', value: paidClaims.filter(c => c.severity === 'catastrophic').length, color: '#991b1b' }
      ];

      const claimsByRegion = Object.entries(
        paidClaims.reduce((acc, c) => {
          acc[c.region] = (acc[c.region] || 0) + Number(c.claim_amount);
          return acc;
        }, {} as Record<string, number>)
      ).map(([label, value]) => ({ label, value }));

      const avgMonthlyPolicies = 50000;
      const claimFrequency = months.length > 0
        ? (totalClaims / months.length / avgMonthlyPolicies) * 100
        : 0;

      setMetrics({
        totalClaims,
        averageClaimSize,
        weatherRelatedPercent,
        claimFrequency,
        claimsTrend,
        forecast: prediction.forecast,
        confidenceUpper: prediction.confidenceUpper,
        confidenceLower: prediction.confidenceLower,
        claimsBySeverity,
        claimsByRegion,
        forecastTrend: prediction.trend
      });
    } catch (error) {
      console.error('Error loading claims data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing claims data...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load claims analysis</p>
      </div>
    );
  }

  const combinedData = [...metrics.claimsTrend, ...metrics.forecast];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Claims Analysis & Forecasting</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Claims (Paid)"
          value={metrics.totalClaims.toLocaleString()}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        />
        <MetricCard
          title="Average Claim Size"
          value={metrics.averageClaimSize}
          format="currency"
          icon={<Activity className="w-6 h-6 text-blue-600" />}
        />
        <MetricCard
          title="Weather-Related Claims"
          value={metrics.weatherRelatedPercent}
          format="percent"
          icon={<Cloud className="w-6 h-6 text-gray-600" />}
        />
        <MetricCard
          title="Claim Frequency Rate"
          value={metrics.claimFrequency.toFixed(2)}
          format="percent"
          icon={<TrendingUp className="w-6 h-6 text-orange-600" />}
          trend={metrics.forecastTrend === 'increasing' ? 'down' : metrics.forecastTrend === 'decreasing' ? 'up' : 'neutral'}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Claims Trend & 6-Month Forecast</h3>
          <p className="text-sm text-gray-600 mt-1">
            Historical data with predictive forecast and confidence intervals
          </p>
        </div>
        <LineChart
          data={combinedData}
          color="#ef4444"
          showGrid
          confidenceUpper={metrics.confidenceUpper}
          confidenceLower={metrics.confidenceLower}
        />
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium text-blue-900">
            Forecast Trend: <span className="capitalize">{metrics.forecastTrend}</span>
          </p>
          <p className="text-xs text-blue-700 mt-1">
            {metrics.forecastTrend === 'increasing' && 'Claims are projected to increase. Consider premium adjustments and enhanced risk management.'}
            {metrics.forecastTrend === 'decreasing' && 'Claims are projected to decrease. This indicates positive trend in risk management.'}
            {metrics.forecastTrend === 'stable' && 'Claims are expected to remain stable. Continue current risk management strategies.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims by Severity</h3>
          <BarChart data={metrics.claimsBySeverity} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims by Region</h3>
          <BarChart data={metrics.claimsByRegion} horizontal />
        </div>
      </div>
    </div>
  );
}
