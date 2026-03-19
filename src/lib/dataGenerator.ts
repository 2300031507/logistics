import { supabase } from './supabase';
import type { Database } from './database.types';

type Product = Database['public']['Tables']['products']['Insert'];
type Claim = Database['public']['Tables']['claims']['Insert'];
type Premium = Database['public']['Tables']['premiums']['Insert'];
type WeatherEvent = Database['public']['Tables']['weather_events']['Insert'];
type Demographic = Database['public']['Tables']['demographics']['Insert'];

export const AVAILABLE_REGIONS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West'] as const;
const claimTypes = ['accident', 'theft', 'natural_disaster', 'medical', 'property_damage'];
const weatherEventTypes = ['hurricane', 'flood', 'wildfire', 'tornado', 'hailstorm', 'drought'];

function getSeverityProfile() {
  const severity = Math.random();
  if (severity < 0.6) return { severityLevel: 'minor', claimMultiplier: 0.1 };
  if (severity < 0.85) return { severityLevel: 'moderate', claimMultiplier: 0.3 };
  if (severity < 0.95) return { severityLevel: 'severe', claimMultiplier: 0.6 };
  return { severityLevel: 'catastrophic', claimMultiplier: 1.2 };
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function firstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function firstDayOfNextMonth(dateString: string): Date {
  const date = new Date(`${dateString}T00:00:00`);
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export async function generateSampleData(): Promise<boolean> {
  try {
    const db = supabase as any;
    const existingProducts = await db.from('products').select('id').limit(1);
    if (existingProducts.data && existingProducts.data.length > 0) {
      return true;
    }

    const products: Product[] = [
      {
        name: 'Basic Auto Insurance',
        category: 'auto',
        base_premium: 1200,
        coverage_amount: 50000,
        risk_tier: 'low',
        active: true
      },
      {
        name: 'Premium Auto Insurance',
        category: 'auto',
        base_premium: 2400,
        coverage_amount: 150000,
        risk_tier: 'medium',
        active: true
      },
      {
        name: 'Standard Home Insurance',
        category: 'home',
        base_premium: 1800,
        coverage_amount: 300000,
        risk_tier: 'medium',
        active: true
      },
      {
        name: 'Premium Home Insurance',
        category: 'home',
        base_premium: 3600,
        coverage_amount: 750000,
        risk_tier: 'high',
        active: true
      },
      {
        name: 'Term Life Insurance',
        category: 'life',
        base_premium: 600,
        coverage_amount: 500000,
        risk_tier: 'low',
        active: true
      },
      {
        name: 'Whole Life Insurance',
        category: 'life',
        base_premium: 2400,
        coverage_amount: 1000000,
        risk_tier: 'medium',
        active: true
      },
      {
        name: 'Basic Health Insurance',
        category: 'health',
        base_premium: 4800,
        coverage_amount: 100000,
        risk_tier: 'medium',
        active: true
      },
      {
        name: 'Comprehensive Health Insurance',
        category: 'health',
        base_premium: 8400,
        coverage_amount: 250000,
        risk_tier: 'high',
        active: true
      }
    ];

    const { data: insertedProducts, error: productsError } = await db
      .from('products')
      .insert(products)
      .select();

    if (productsError) throw productsError;
    if (!insertedProducts) throw new Error('Failed to insert products');

    const demographics: Demographic[] = AVAILABLE_REGIONS.map(region => ({
      region,
      population: Math.floor(Math.random() * 10000000) + 1000000,
      median_income: Math.floor(Math.random() * 50000) + 40000,
      risk_factors: {
        crime_rate: Math.random() * 10,
        natural_disaster_frequency: Math.random() * 5,
        healthcare_access: Math.random() * 100
      }
    }));

    const { error: demographicsError } = await db
      .from('demographics')
      .insert(demographics);

    if (demographicsError) throw demographicsError;

    const startDate = new Date('2022-01-01');
    const endDate = new Date('2024-12-31');
    const claims: Claim[] = [];
    const premiums: Premium[] = [];
    const weatherEvents: WeatherEvent[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      insertedProducts.forEach((product: any) => {
        AVAILABLE_REGIONS.forEach(region => {
          const basePolicyCount = Math.floor(Math.random() * 500) + 100;
          const premiumAmount = product.base_premium * basePolicyCount * (0.95 + Math.random() * 0.1);

          premiums.push({
            product_id: product.id,
            premium_amount: Math.round(premiumAmount),
            premium_date: dateStr,
            region,
            policy_count: basePolicyCount
          });

          const claimProbability = product.risk_tier === 'high' ? 0.15 : product.risk_tier === 'medium' ? 0.08 : 0.04;
          const numClaims = Math.floor(basePolicyCount * claimProbability);

          for (let i = 0; i < numClaims; i++) {
            const isWeatherRelated = Math.random() > 0.7;
            const { severityLevel, claimMultiplier } = getSeverityProfile();

            const baseClaimAmount = product.coverage_amount * claimMultiplier * (0.8 + Math.random() * 0.4);

            claims.push({
              product_id: product.id,
              claim_amount: Math.round(baseClaimAmount),
              claim_date: dateStr,
              claim_type: claimTypes[Math.floor(Math.random() * claimTypes.length)],
              region,
              weather_related: isWeatherRelated,
              severity: severityLevel,
              status: Math.random() > 0.1 ? 'paid' : Math.random() > 0.5 ? 'approved' : 'pending'
            });
          }
        });
      });

      if (Math.random() > 0.7) {
        weatherEvents.push({
          event_type: weatherEventTypes[Math.floor(Math.random() * weatherEventTypes.length)],
          event_date: dateStr,
          region: AVAILABLE_REGIONS[Math.floor(Math.random() * AVAILABLE_REGIONS.length)],
          severity_score: Math.random() * 10,
          estimated_impact: Math.floor(Math.random() * 10000000) + 100000
        });
      }
    }

    const { error: claimsError } = await db.from('claims').insert(claims);
    if (claimsError) throw claimsError;

    const { error: premiumsError } = await db.from('premiums').insert(premiums);
    if (premiumsError) throw premiumsError;

    const { error: weatherError } = await db.from('weather_events').insert(weatherEvents);
    if (weatherError) throw weatherError;

    return true;
  } catch (error) {
    console.error('Error generating sample data:', error);
    return false;
  }
}

export async function appendLatestOperationalData(): Promise<boolean> {
  try {
    const db = supabase as any;
    const latestPremium = await db
      .from('premiums')
      .select('premium_date')
      .order('premium_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPremium.error) throw latestPremium.error;

    if (!latestPremium.data?.premium_date) {
      return generateSampleData();
    }

    const monthToGenerate = firstDayOfNextMonth(latestPremium.data.premium_date);
    const currentMonthStart = firstDayOfCurrentMonth();

    if (monthToGenerate > currentMonthStart) {
      return true;
    }

    const productsRes = await db
      .from('products')
      .select('id, base_premium, risk_tier, coverage_amount, active')
      .eq('active', true);

    if (productsRes.error) throw productsRes.error;

    const products = productsRes.data || [];
    if (products.length === 0) return true;

    const dateStr = getMonthKey(monthToGenerate);
    const premiums: Premium[] = [];
    const claims: Claim[] = [];
    const weatherEvents: WeatherEvent[] = [];

    products.forEach((product: any) => {
      AVAILABLE_REGIONS.forEach(region => {
        const basePolicyCount = Math.floor(Math.random() * 260) + 220;
        const seasonalityFactor = 0.9 + Math.random() * 0.2;
        const premiumAmount = product.base_premium * basePolicyCount * seasonalityFactor;

        premiums.push({
          product_id: product.id,
          premium_amount: Math.round(premiumAmount),
          premium_date: dateStr,
          region,
          policy_count: basePolicyCount
        });

        const claimProbability = product.risk_tier === 'high' ? 0.13 : product.risk_tier === 'medium' ? 0.08 : 0.05;
        const numClaims = Math.max(1, Math.floor(basePolicyCount * claimProbability * (0.8 + Math.random() * 0.4)));

        for (let i = 0; i < numClaims; i++) {
          const isWeatherRelated = Math.random() > 0.72;
          const { severityLevel, claimMultiplier } = getSeverityProfile();
          const baseClaimAmount = product.coverage_amount * claimMultiplier * (0.85 + Math.random() * 0.35);

          claims.push({
            product_id: product.id,
            claim_amount: Math.round(baseClaimAmount),
            claim_date: dateStr,
            claim_type: claimTypes[Math.floor(Math.random() * claimTypes.length)],
            region,
            weather_related: isWeatherRelated,
            severity: severityLevel,
            status: Math.random() > 0.12 ? 'paid' : Math.random() > 0.5 ? 'approved' : 'pending'
          });
        }
      });
    });

    AVAILABLE_REGIONS.forEach(region => {
      if (Math.random() > 0.72) {
        weatherEvents.push({
          event_type: weatherEventTypes[Math.floor(Math.random() * weatherEventTypes.length)],
          event_date: dateStr,
          region,
          severity_score: Number((Math.random() * 10).toFixed(2)),
          estimated_impact: Math.floor(Math.random() * 12000000) + 50000
        });
      }
    });

    if (premiums.length > 0) {
      const premiumsInsert = await db.from('premiums').insert(premiums);
      if (premiumsInsert.error) throw premiumsInsert.error;
    }

    if (claims.length > 0) {
      const claimsInsert = await db.from('claims').insert(claims);
      if (claimsInsert.error) throw claimsInsert.error;
    }

    if (weatherEvents.length > 0) {
      const weatherInsert = await db.from('weather_events').insert(weatherEvents);
      if (weatherInsert.error) throw weatherInsert.error;
    }

    return true;
  } catch (error) {
    console.error('Error appending latest operational data:', error);
    return false;
  }
}
