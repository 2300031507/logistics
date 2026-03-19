export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface PredictionResult {
  forecast: TimeSeriesPoint[];
  confidenceUpper: TimeSeriesPoint[];
  confidenceLower: TimeSeriesPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

export function calculateMovingAverage(data: TimeSeriesPoint[], window: number): TimeSeriesPoint[] {
  const result: TimeSeriesPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
      continue;
    }

    const sum = data.slice(i - window + 1, i + 1).reduce((acc, point) => acc + point.value, 0);
    result.push({
      date: data[i].date,
      value: sum / window
    });
  }

  return result;
}

export function forecastTimeSeries(
  historicalData: TimeSeriesPoint[],
  periodsAhead: number
): PredictionResult {
  if (historicalData.length < 2) {
    throw new Error('Insufficient data for forecasting');
  }

  const values = historicalData.map(d => d.value);
  const n = values.length;

  const sumX = (n * (n + 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, val, idx) => acc + val * (idx + 1), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const residuals = values.map((val, idx) => val - (intercept + slope * (idx + 1)));
  const stdDev = Math.sqrt(residuals.reduce((acc, r) => acc + r * r, 0) / n);

  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const forecast: TimeSeriesPoint[] = [];
  const confidenceUpper: TimeSeriesPoint[] = [];
  const confidenceLower: TimeSeriesPoint[] = [];

  for (let i = 1; i <= periodsAhead; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + i * 30);

    const predicted = intercept + slope * (n + i);
    const margin = 1.96 * stdDev * Math.sqrt(1 + 1/n + Math.pow(i, 2) / sumX2);

    forecast.push({
      date: nextDate.toISOString().split('T')[0],
      value: Math.max(0, predicted)
    });

    confidenceUpper.push({
      date: nextDate.toISOString().split('T')[0],
      value: Math.max(0, predicted + margin)
    });

    confidenceLower.push({
      date: nextDate.toISOString().split('T')[0],
      value: Math.max(0, predicted - margin)
    });
  }

  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const changePercent = ((lastValue - firstValue) / firstValue) * 100;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (slope > 0.05 * (sumY / n)) trend = 'increasing';
  else if (slope < -0.05 * (sumY / n)) trend = 'decreasing';

  return { forecast, confidenceUpper, confidenceLower, trend, changePercent };
}

export function calculateProfitability(
  premiums: number,
  claims: number,
  expenses: number = 0
): {
  profit: number;
  margin: number;
  lossRatio: number;
  expenseRatio: number;
  combinedRatio: number;
} {
  const profit = premiums - claims - expenses;
  const margin = premiums > 0 ? (profit / premiums) * 100 : 0;
  const lossRatio = premiums > 0 ? (claims / premiums) * 100 : 0;
  const expenseRatio = premiums > 0 ? (expenses / premiums) * 100 : 0;
  const combinedRatio = lossRatio + expenseRatio;

  return { profit, margin, lossRatio, expenseRatio, combinedRatio };
}

export function optimizePricing(
  currentPremium: number,
  expectedClaims: number,
  targetMargin: number = 0.15,
  riskAdjustment: number = 1.0
): {
  recommendedPremium: number;
  priceChange: number;
  priceChangePercent: number;
  expectedMargin: number;
} {
  const operatingExpenses = currentPremium * 0.25;
  const requiredRevenue = (expectedClaims + operatingExpenses) / (1 - targetMargin);
  const recommendedPremium = Math.ceil(requiredRevenue * riskAdjustment);
  const priceChange = recommendedPremium - currentPremium;
  const priceChangePercent = (priceChange / currentPremium) * 100;
  const expectedMargin = ((recommendedPremium - expectedClaims - operatingExpenses) / recommendedPremium) * 100;

  return { recommendedPremium, priceChange, priceChangePercent, expectedMargin };
}

export function assessRisk(
  historicalClaims: number[],
  weatherEvents: number,
  demographicRiskScore: number
): {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  volatility: number;
  recommendation: string;
} {
  const mean = historicalClaims.reduce((a, b) => a + b, 0) / historicalClaims.length;
  const variance = historicalClaims.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / historicalClaims.length;
  const volatility = Math.sqrt(variance) / mean;

  const claimTrend = historicalClaims.length >= 2
    ? (historicalClaims[historicalClaims.length - 1] - historicalClaims[0]) / historicalClaims[0]
    : 0;

  const baseScore = 50;
  const volatilityScore = Math.min(volatility * 100, 30);
  const trendScore = Math.max(claimTrend * 50, -20);
  const weatherScore = Math.min(weatherEvents * 2, 20);
  const demographicScore = demographicRiskScore;

  const riskScore = Math.max(0, Math.min(100,
    baseScore + volatilityScore + trendScore + weatherScore + demographicScore
  ));

  let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
  let recommendation = 'Monitor claims trends closely.';

  if (riskScore < 40) {
    riskLevel = 'Low';
    recommendation = 'Risk levels are acceptable. Consider competitive pricing.';
  } else if (riskScore < 60) {
    riskLevel = 'Medium';
    recommendation = 'Monitor claims trends and adjust premiums accordingly.';
  } else if (riskScore < 80) {
    riskLevel = 'High';
    recommendation = 'Implement risk mitigation strategies. Consider premium increases.';
  } else {
    riskLevel = 'Critical';
    recommendation = 'Urgent action required. Review underwriting criteria and pricing.';
  }

  return { riskScore, riskLevel, volatility, recommendation };
}
