import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MetricCard } from './MetricCard';
import { LineChart } from './LineChart';
import { BarChart } from './BarChart';
import { DollarSign, TrendingUp, AlertTriangle, FileText } from 'lucide-react';
import { calculateProfitability } from '../lib/analytics';
import { isDateInWindow, matchesRegion, type TimeWindow } from '../lib/filters';

interface OverviewMetrics {
  totalPremiums: number;
  totalClaims: number;
  lossRatio: number;
  profitMargin: number;
  activeProducts: number;
  premiumTrend: Array<{ date: string; value: number }>;
  claimTrend: Array<{ date: string; value: number }>;
  productPerformance: Array<{ label: string; value: number; color?: string }>;
}

interface PremiumRow {
  premium_amount: number;
  premium_date: string;
  region: string;
  product_id: string | null;
}

interface ClaimRow {
  claim_amount: number;
  claim_date: string;
  status: string;
  region: string;
}

interface ProductRow {
  id: string;
  name: string;
  active: boolean;
}

interface DashboardOverviewProps {
  regionFilter: string;
  timeWindow: TimeWindow;
  refreshKey: number;
}

export function DashboardOverview({ regionFilter, timeWindow, refreshKey }: DashboardOverviewProps) {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [regionFilter, timeWindow, refreshKey]);

  async function loadMetrics() {
    try {
      const [premiumsRes, claimsRes, productsRes] = await Promise.all([
        supabase.from('premiums').select('premium_amount, premium_date, region, product_id'),
        supabase.from('claims').select('claim_amount, claim_date, status, region'),
        supabase.from('products').select('id, name, active')
      ]);

      if (premiumsRes.error) throw premiumsRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (productsRes.error) throw productsRes.error;

      const allPremiums = (premiumsRes.data || []) as PremiumRow[];
      const allClaims = (claimsRes.data || []) as ClaimRow[];
      const products = (productsRes.data || []) as ProductRow[];

      const filteredPremiums = allPremiums.filter(
        p => matchesRegion(p.region ?? 'Unknown', regionFilter) && isDateInWindow(p.premium_date, timeWindow)
      );
      const filteredClaims = allClaims.filter(
        c => matchesRegion(c.region ?? 'Unknown', regionFilter) && isDateInWindow(c.claim_date, timeWindow)
      );

      const totalPremiums = filteredPremiums.reduce((sum, p) => sum + Number(p.premium_amount), 0);
      const paidClaims = filteredClaims.filter(c => c.status === 'paid');
      const totalClaims = paidClaims.reduce((sum, c) => sum + Number(c.claim_amount), 0);

      const profitability = calculateProfitability(totalPremiums, totalClaims);

      const premiumsByMonth = filteredPremiums.reduce((acc, p) => {
        const month = p.premium_date.substring(0, 7);
        acc[month] = (acc[month] || 0) + Number(p.premium_amount);
        return acc;
      }, {} as Record<string, number>);

      const claimsByMonth = paidClaims.reduce((acc, c) => {
        const month = c.claim_date.substring(0, 7);
        acc[month] = (acc[month] || 0) + Number(c.claim_amount);
        return acc;
      }, {} as Record<string, number>);

      const months = Array.from(new Set([...Object.keys(premiumsByMonth), ...Object.keys(claimsByMonth)])).sort();

      const premiumTrend = months.map(month => ({
        date: `${month}-01`,
        value: premiumsByMonth[month] || 0
      }));

      const claimTrend = months.map(month => ({
        date: `${month}-01`,
        value: claimsByMonth[month] || 0
      }));

      const productIds = new Set(products.slice(0, 6).map(p => p.id));
      const premiumByProduct = filteredPremiums.reduce((acc, premium) => {
        if (!premium.product_id || !productIds.has(premium.product_id)) return acc;
        acc[premium.product_id] = (acc[premium.product_id] || 0) + Number(premium.premium_amount);
        return acc;
      }, {} as Record<string, number>);

      const productPremiums = products
        .slice(0, 6)
        .map(product => ({
          label: product.name,
          value: premiumByProduct[product.id] || 0
        }));

      setMetrics({
        totalPremiums,
        totalClaims,
        lossRatio: profitability.lossRatio,
        profitMargin: profitability.margin,
        activeProducts: products.filter(p => p.active).length,
        premiumTrend,
        claimTrend,
        productPerformance: productPremiums
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load metrics</p>
      </div>
    );
  }

  const premiumChange = metrics.premiumTrend.length >= 2
    ? ((metrics.premiumTrend[metrics.premiumTrend.length - 1].value - metrics.premiumTrend[metrics.premiumTrend.length - 2].value) / metrics.premiumTrend[metrics.premiumTrend.length - 2].value) * 100
    : 0;

  const claimChange = metrics.claimTrend.length >= 2
    ? ((metrics.claimTrend[metrics.claimTrend.length - 1].value - metrics.claimTrend[metrics.claimTrend.length - 2].value) / metrics.claimTrend[metrics.claimTrend.length - 2].value) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Premium Revenue"
          value={metrics.totalPremiums}
          format="currency"
          change={premiumChange}
          changeLabel="vs last month"
          icon={<DollarSign className="w-6 h-6 text-blue-600" />}
        />
        <MetricCard
          title="Total Claims Paid"
          value={metrics.totalClaims}
          format="currency"
          change={claimChange}
          changeLabel="vs last month"
          icon={<FileText className="w-6 h-6 text-orange-600" />}
          trend={claimChange > 0 ? 'down' : 'up'}
        />
        <MetricCard
          title="Loss Ratio"
          value={metrics.lossRatio}
          format="percent"
          icon={<AlertTriangle className="w-6 h-6 text-yellow-600" />}
          trend={metrics.lossRatio > 70 ? 'down' : metrics.lossRatio < 50 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Profit Margin"
          value={metrics.profitMargin}
          format="percent"
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          trend={metrics.profitMargin > 15 ? 'up' : metrics.profitMargin < 5 ? 'down' : 'neutral'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Premium Revenue Trend</h3>
          <LineChart data={metrics.premiumTrend} color="#3b82f6" showGrid />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Paid Trend</h3>
          <LineChart data={metrics.claimTrend} color="#f59e0b" showGrid />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Premium Revenue by Product</h3>
        <BarChart data={metrics.productPerformance} />
      </div>
    </div>
  );
}
