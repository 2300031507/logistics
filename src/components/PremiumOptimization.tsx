import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MetricCard } from './MetricCard';
import { BarChart } from './BarChart';
import { DollarSign, TrendingUp, Target, Percent } from 'lucide-react';
import { optimizePricing } from '../lib/analytics';
import { isDateInWindow, matchesRegion, type TimeWindow } from '../lib/filters';

interface ProductRecommendation {
  productId: string;
  productName: string;
  category: string;
  currentPremium: number;
  recommendedPremium: number;
  priceChange: number;
  priceChangePercent: number;
  expectedMargin: number;
  averageClaimAmount: number;
  claimCount: number;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  base_premium: number;
  risk_tier: string;
}

interface ClaimRow {
  product_id: string | null;
  claim_amount: number;
  region: string;
  status: string;
  claim_date: string;
}

interface PremiumOptimizationProps {
  regionFilter: string;
  timeWindow: TimeWindow;
  refreshKey: number;
}

export function PremiumOptimization({ regionFilter, timeWindow, refreshKey }: PremiumOptimizationProps) {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOptimizationData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, claimsRes] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('claims').select('product_id, claim_amount, region, status, claim_date')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (claimsRes.error) throw claimsRes.error;

      const products = (productsRes.data || []) as ProductRow[];
      const claims = ((claimsRes.data || []) as ClaimRow[]).filter(
        claim => matchesRegion(claim.region ?? 'Unknown', regionFilter) && isDateInWindow(claim.claim_date, timeWindow)
      );

      const productRecommendations: ProductRecommendation[] = products.map(product => {
        const productClaims = claims.filter(
          c => c.product_id === product.id && c.status === 'paid'
        );

        const totalClaimAmount = productClaims.reduce((sum, c) => sum + Number(c.claim_amount), 0);
        const claimCount = productClaims.length;
        const averageClaimAmount = claimCount > 0 ? totalClaimAmount / claimCount : 0;

        const expectedAnnualClaims = averageClaimAmount * Math.max(claimCount / 3, 1);

        const riskMultiplier = product.risk_tier === 'high' ? 1.3 : product.risk_tier === 'medium' ? 1.1 : 1.0;

        const optimization = optimizePricing(
          product.base_premium,
          expectedAnnualClaims,
          0.15,
          riskMultiplier
        );

        return {
          productId: product.id,
          productName: product.name,
          category: product.category,
          currentPremium: product.base_premium,
          recommendedPremium: optimization.recommendedPremium,
          priceChange: optimization.priceChange,
          priceChangePercent: optimization.priceChangePercent,
          expectedMargin: optimization.expectedMargin,
          averageClaimAmount,
          claimCount
        };
      });

      setRecommendations(productRecommendations);
    } catch (error) {
      console.error('Error loading optimization data:', error);
    } finally {
      setLoading(false);
    }
  }, [regionFilter, timeWindow, refreshKey]);

  useEffect(() => {
    loadOptimizationData();
  }, [loadOptimizationData]);

  async function applyRecommendations() {
    try {
      const updates = recommendations.map(rec => ({
        id: rec.productId,
        base_premium: rec.recommendedPremium,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('products').upsert(updates);

      if (error) throw error;

      alert('Pricing recommendations applied successfully!');
      loadOptimizationData();
    } catch (error) {
      console.error('Error applying recommendations:', error);
      alert('Failed to apply recommendations');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Optimizing pricing...</p>
        </div>
      </div>
    );
  }

  const totalPriceIncrease = recommendations.reduce((sum, r) => sum + r.priceChange, 0);
  const avgPriceChange = recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + r.priceChangePercent, 0) / recommendations.length
    : 0;
  const avgExpectedMargin = recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + r.expectedMargin, 0) / recommendations.length
    : 0;

  const priceChangeData = recommendations.map(r => ({
    label: r.productName.split(' ').slice(0, 2).join(' '),
    value: r.priceChangePercent,
    color: r.priceChangePercent > 0 ? '#3b82f6' : '#10b981'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Premium Optimization Engine</h2>
        <span className="text-sm text-gray-500">
          Scope: {regionFilter === 'All' ? 'All Regions' : regionFilter} · {timeWindow === 'all' ? 'All History' : `Last ${timeWindow} months`}
        </span>
        <button
          onClick={applyRecommendations}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Apply Recommendations
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Recommended Products"
          value={recommendations.length}
          icon={<Target className="w-6 h-6 text-blue-600" />}
        />
        <MetricCard
          title="Total Premium Adjustment"
          value={totalPriceIncrease}
          format="currency"
          icon={<DollarSign className="w-6 h-6 text-green-600" />}
          trend={totalPriceIncrease > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Avg Price Change"
          value={avgPriceChange}
          format="percent"
          icon={<Percent className="w-6 h-6 text-orange-600" />}
        />
        <MetricCard
          title="Expected Profit Margin"
          value={avgExpectedMargin}
          format="percent"
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          trend="up"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Change Recommendations by Product</h3>
        <BarChart data={priceChangeData} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Pricing Recommendations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Premium</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Recommended Premium</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Margin</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Claim</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recommendations.map((rec) => (
                <tr key={rec.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rec.productName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{rec.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${rec.currentPremium.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                    ${rec.recommendedPremium.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    rec.priceChangePercent > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {rec.priceChangePercent > 0 ? '+' : ''}{rec.priceChangePercent.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {rec.expectedMargin.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${rec.averageClaimAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
