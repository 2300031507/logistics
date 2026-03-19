import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MetricCard } from './MetricCard';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { AlertTriangle, Cloud, TrendingUp, MapPin } from 'lucide-react';
import { assessRisk } from '../lib/analytics';
import { isDateInWindow, matchesRegion, type TimeWindow } from '../lib/filters';

interface RiskMetrics {
  overallRiskScore: number;
  overallRiskLevel: string;
  weatherEventsCount: number;
  highRiskRegions: number;
  riskByRegion: Array<{ label: string; value: number; color?: string }>;
  weatherEventsTrend: Array<{ date: string; value: number }>;
  riskRecommendation: string;
  regionalDetails: Array<{
    region: string;
    riskScore: number;
    riskLevel: string;
    weatherEvents: number;
    totalClaims: number;
    recommendation: string;
  }>;
}

interface ClaimRow {
  claim_amount: number;
  region: string;
  claim_date: string;
  status: string;
}

interface WeatherEventRow {
  event_date: string;
  region: string;
}

interface RiskFactors {
  crime_rate?: number;
  natural_disaster_frequency?: number;
  healthcare_access?: number;
}

interface DemographicRow {
  region: string;
  risk_factors: Record<string, unknown>;
}

interface RiskAssessmentProps {
  regionFilter: string;
  timeWindow: TimeWindow;
  refreshKey: number;
}

export function RiskAssessment({ regionFilter, timeWindow, refreshKey }: RiskAssessmentProps) {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRiskData = useCallback(async () => {
    try {
      setLoading(true);
      const [claimsRes, weatherRes, demographicsRes] = await Promise.all([
        supabase.from('claims').select('claim_amount, region, claim_date, status'),
        supabase.from('weather_events').select('*'),
        supabase.from('demographics').select('*')
      ]);

      if (claimsRes.error) throw claimsRes.error;
      if (weatherRes.error) throw weatherRes.error;
      if (demographicsRes.error) throw demographicsRes.error;

      const allClaims = (claimsRes.data || []) as ClaimRow[];
      const allWeatherEvents = (weatherRes.data || []) as WeatherEventRow[];
      const demographics = (demographicsRes.data || []) as DemographicRow[];

      const claims = allClaims.filter(
        claim => matchesRegion(claim.region ?? 'Unknown', regionFilter) && isDateInWindow(claim.claim_date, timeWindow)
      );
      const weatherEvents = allWeatherEvents.filter(
        event => matchesRegion(event.region ?? 'Unknown', regionFilter) && isDateInWindow(event.event_date, timeWindow)
      );

      const paidClaims = claims.filter(c => c.status === 'paid');

      const claimsByRegion = paidClaims.reduce((acc, claim) => {
        if (!acc[claim.region]) {
          acc[claim.region] = [];
        }
        acc[claim.region].push(Number(claim.claim_amount));
        return acc;
      }, {} as Record<string, number[]>);

      const weatherByRegion = weatherEvents.reduce((acc, event) => {
        acc[event.region] = (acc[event.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const regionalDetails = Object.keys(claimsByRegion).map(region => {
        const regionClaims = claimsByRegion[region];
        const weatherCount = weatherByRegion[region] || 0;
        const demographic = demographics.find(d => d.region === region);
        const riskFactors = demographic?.risk_factors as RiskFactors | undefined;
        const demographicRisk = riskFactors?.natural_disaster_frequency
          ? riskFactors.natural_disaster_frequency * 5
          : 0;

        const risk = assessRisk(regionClaims, weatherCount, demographicRisk);

        return {
          region,
          riskScore: risk.riskScore,
          riskLevel: risk.riskLevel,
          weatherEvents: weatherCount,
          totalClaims: regionClaims.length,
          recommendation: risk.recommendation
        };
      });

      regionalDetails.sort((a, b) => b.riskScore - a.riskScore);

      const overallClaimAmounts = paidClaims.map(c => Number(c.claim_amount));
      const overallWeatherEvents = weatherEvents.length;
      const avgDemographicRisk = demographics.reduce((sum, d) => {
        const riskFactors = d.risk_factors as RiskFactors | undefined;
        return sum + (riskFactors?.natural_disaster_frequency || 0) * 5;
      }, 0) / demographics.length;

      const overallRisk = overallClaimAmounts.length > 0
        ? assessRisk(overallClaimAmounts, overallWeatherEvents, Number.isFinite(avgDemographicRisk) ? avgDemographicRisk : 0)
        : {
            riskScore: 0,
            riskLevel: 'Low' as const,
            volatility: 0,
            recommendation: 'Insufficient data for selected filters. Expand time window or region.'
          };

      const riskByRegion = regionalDetails.map(r => ({
        label: r.region,
        value: r.riskScore,
        color: r.riskScore >= 80 ? '#991b1b' : r.riskScore >= 60 ? '#ef4444' : r.riskScore >= 40 ? '#f59e0b' : '#10b981'
      }));

      const weatherEventsByMonth = weatherEvents.reduce((acc, event) => {
        const month = event.event_date.substring(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const weatherEventsTrend = Object.keys(weatherEventsByMonth)
        .sort()
        .map(month => ({
          date: `${month}-01`,
          value: weatherEventsByMonth[month]
        }));

      const highRiskRegions = regionalDetails.filter(r => r.riskScore >= 60).length;

      setMetrics({
        overallRiskScore: overallRisk.riskScore,
        overallRiskLevel: overallRisk.riskLevel,
        weatherEventsCount: weatherEvents.length,
        highRiskRegions,
        riskByRegion,
        weatherEventsTrend,
        riskRecommendation: overallRisk.recommendation,
        regionalDetails
      });
    } catch (error) {
      console.error('Error loading risk data:', error);
    } finally {
      setLoading(false);
    }
  }, [regionFilter, timeWindow]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Assessing risk factors...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load risk assessment</p>
      </div>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600 bg-green-50';
      case 'Medium': return 'text-yellow-600 bg-yellow-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Risk Assessment & Climate Analysis</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Overall Risk Score"
          value={`${metrics.overallRiskScore.toFixed(0)}/100`}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
        />
        <MetricCard
          title="Weather Events"
          value={metrics.weatherEventsCount}
          icon={<Cloud className="w-6 h-6 text-gray-600" />}
        />
        <MetricCard
          title="High Risk Regions"
          value={metrics.highRiskRegions}
          icon={<MapPin className="w-6 h-6 text-orange-600" />}
        />
        <MetricCard
          title="Risk Trend"
          value={metrics.overallRiskLevel}
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
          trend={metrics.overallRiskLevel === 'Critical' || metrics.overallRiskLevel === 'High' ? 'down' : 'up'}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className={`p-4 rounded-lg ${getRiskColor(metrics.overallRiskLevel)}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Risk Level: {metrics.overallRiskLevel}</h4>
              <p className="text-sm">{metrics.riskRecommendation}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Score by Region</h3>
          <BarChart data={metrics.riskByRegion} horizontal />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weather Events Trend</h3>
          <LineChart data={metrics.weatherEventsTrend} color="#6b7280" showGrid />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Regional Risk Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Weather Events</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Claims</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.regionalDetails.map((detail) => (
                <tr key={detail.region} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{detail.region}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm font-semibold text-gray-900">{detail.riskScore.toFixed(0)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(detail.riskLevel)}`}>
                      {detail.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{detail.weatherEvents}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{detail.totalClaims}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{detail.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
