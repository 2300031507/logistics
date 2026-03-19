import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MetricCard } from './MetricCard';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { DollarSign, TrendingUp, Percent, Target } from 'lucide-react';
import { forecastTimeSeries, calculateProfitability, type TimeSeriesPoint } from '../lib/analytics';
import { isDateInWindow, matchesRegion, type TimeWindow } from '../lib/filters';

interface ProfitabilityMetrics {
  currentProfit: number;
  currentMargin: number;
  lossRatio: number;
  combinedRatio: number;
  profitTrend: TimeSeriesPoint[];
  profitForecast: TimeSeriesPoint[];
  confidenceUpper: TimeSeriesPoint[];
  confidenceLower: TimeSeriesPoint[];
  productProfitability: Array<{ label: string; value: number; color?: string }>;
  forecastTrend: 'increasing' | 'decreasing' | 'stable';
  projectedAnnualProfit: number;
}

interface PremiumRow {
  premium_amount: number;
  premium_date: string;
  product_id: string | null;
  region: string;
}

interface ClaimRow {
  claim_amount: number;
  claim_date: string;
  product_id: string | null;
  status: string;
  region: string;
}

interface ProductRow {
  id: string;
  name: string;
}

interface ProfitabilityForecastProps {
  regionFilter: string;
  timeWindow: TimeWindow;
  refreshKey: number;
}

export function ProfitabilityForecast({ regionFilter, timeWindow, refreshKey }: ProfitabilityForecastProps) {
  const [metrics, setMetrics] = useState<ProfitabilityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfitabilityData = useCallback(async () => {
    try {
      setLoading(true);
      const [premiumsRes, claimsRes, productsRes] = await Promise.all([
        supabase.from('premiums').select('premium_amount, premium_date, product_id, region'),
        supabase.from('claims').select('claim_amount, claim_date, product_id, status, region'),
        supabase.from('products').select('*')
      ]);

      if (premiumsRes.error) throw premiumsRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (productsRes.error) throw productsRes.error;

      const premiumsData = (premiumsRes.data || []) as PremiumRow[];
      const claimsData = (claimsRes.data || []) as ClaimRow[];
      
      const premiums = premiumsData.filter(
        premium => matchesRegion(premium.region ?? 'Unknown', regionFilter) && isDateInWindow(premium.premium_date, timeWindow)
      );
      const claims = claimsData.filter(
        claim => matchesRegion(claim.region ?? 'Unknown', regionFilter) && isDateInWindow(claim.claim_date, timeWindow)
      );
      const products = (productsRes.data || []) as ProductRow[];

      const paidClaims = claims.filter(c => c.status === 'paid');

      const totalPremiums = premiums.reduce((sum, p) => sum + Number(p.premium_amount), 0);
      const totalClaims = paidClaims.reduce((sum, c) => sum + Number(c.claim_amount), 0);
      const operatingExpenses = totalPremiums * 0.25;

      const profitability = calculateProfitability(totalPremiums, totalClaims, operatingExpenses);

      const profitByMonth = premiums.reduce((acc, premium) => {
        const month = premium.premium_date.substring(0, 7);
        if (!acc[month]) {
          acc[month] = { premiums: 0, claims: 0 };
        }
        acc[month].premiums += Number(premium.premium_amount);
        return acc;
      }, {} as Record<string, { premiums: number; claims: number }>);

      paidClaims.forEach(claim => {
        const month = claim.claim_date.substring(0, 7);
        if (profitByMonth[month]) {
          profitByMonth[month].claims += Number(claim.claim_amount);
        }
      });

      const months = Object.keys(profitByMonth).sort();
      const profitTrend = months.map(month => ({
        date: `${month}-01`,
        value: profitByMonth[month].premiums - profitByMonth[month].claims - (profitByMonth[month].premiums * 0.25)
      }));

      const prediction = profitTrend.length >= 2
        ? forecastTimeSeries(profitTrend, 6)
        : {
            forecast: [],
            confidenceUpper: [],
            confidenceLower: [],
            trend: 'stable' as const,
            changePercent: 0
          };

      const productProfitability = products.slice(0, 6).map(product => {
        const productPremiums = premiums.filter(p => p.product_id === product.id).reduce((sum, p) => sum + Number(p.premium_amount), 0);
        const productClaims = paidClaims.filter(c => c.product_id === product.id).reduce((sum, c) => sum + Number(c.claim_amount), 0);
        const margin = productPremiums > 0 ? ((productPremiums - productClaims - (productPremiums * 0.25)) / productPremiums) * 100 : 0;
        return { label: product.name, value: margin };
      });

      setMetrics({
        currentProfit: profitability.profit,
        currentMargin: profitability.margin,
        lossRatio: profitability.lossRatio,
        combinedRatio: profitability.combinedRatio,
        profitTrend,
        profitForecast: prediction.forecast,
        confidenceUpper: prediction.confidenceUpper,
        confidenceLower: prediction.confidenceLower,
        productProfitability,
        forecastTrend: prediction.trend,
        projectedAnnualProfit: profitability.profit * (12 / (timeWindow === 'all' ? 36 : timeWindow))
      });
    } catch (error) {
      console.error('Error loading profitability data:', error);
    } finally {
      setLoading(false);
    }
  }, [regionFilter, timeWindow]);

  useEffect(() => {
    loadProfitabilityData();
  }, [loadProfitabilityData, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Forecasting profitability...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load profitability forecast</p>
      </div>
    );
  }

  const combinedData = [...metrics.profitTrend, ...metrics.profitForecast];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Profitability Forecasting</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Current Profit"
          value={metrics.currentProfit}
          format="currency"
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          trend={metrics.currentProfit > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Profit Margin"
          value={metrics.currentMargin}
          format="percent"
          icon={<Percent className="w-6 h-6 text-blue-600" />}
          trend={metrics.currentMargin > 15 ? 'up' : metrics.currentMargin < 5 ? 'down' : 'neutral'}
        />
        <MetricCard
          title="Loss Ratio"
          value={metrics.lossRatio}
          format="percent"
          icon={<Target className="w-6 h-6 text-orange-600" />}
          trend={metrics.lossRatio > 70 ? 'down' : 'up'}
        />
        <MetricCard
          title="Combined Ratio"
          value={metrics.combinedRatio}
          format="percent"
          icon={<TrendingUp className="w-6 h-6 text-red-600" />}
          trend={metrics.combinedRatio > 100 ? 'down' : 'up'}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profit Trend & 6-Month Forecast</h3>
          <p className="text-sm text-gray-600 mt-1">
            Historical profitability with predictive forecast and confidence intervals
          </p>
        </div>
        <LineChart
          data={combinedData}
          color="#10b981"
          showGrid
          confidenceUpper={metrics.confidenceUpper}
          confidenceLower={metrics.confidenceLower}
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900">Projected Annual Profit</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              ${metrics.projectedAnnualProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Forecast Trend: <span className="capitalize">{metrics.forecastTrend}</span></p>
            <p className="text-xs text-blue-700 mt-1">
              {metrics.forecastTrend === 'increasing' && 'Profitability is projected to improve. Continue current strategies.'}
              {metrics.forecastTrend === 'decreasing' && 'Profitability is projected to decline. Review pricing and claims management.'}
              {metrics.forecastTrend === 'stable' && 'Profitability is expected to remain stable.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Margin by Product</h3>
        <BarChart data={metrics.productProfitability} />
        <div className="mt-4 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-gray-600">Healthy (&gt;15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-gray-600">Moderate (5-15%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600">Low (&lt;5%)</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-3">Loss Ratio Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Loss Ratio</span>
                <span className={`text-sm font-semibold ${
                  metrics.lossRatio > 70 ? 'text-red-600' : metrics.lossRatio > 60 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.lossRatio.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.lossRatio > 70 ? 'bg-red-600' : metrics.lossRatio > 60 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(metrics.lossRatio, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Target: Below 60% | Industry Avg: 65-70%
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-600 mb-3">Combined Ratio Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Combined Ratio</span>
                <span className={`text-sm font-semibold ${
                  metrics.combinedRatio > 100 ? 'text-red-600' : metrics.combinedRatio > 95 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.combinedRatio.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.combinedRatio > 100 ? 'bg-red-600' : metrics.combinedRatio > 95 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(metrics.combinedRatio, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Target: Below 95% | Above 100% indicates underwriting loss
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
