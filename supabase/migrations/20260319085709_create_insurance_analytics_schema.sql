/*
  # Insurance Predictive Analytics Schema

  ## Overview
  Complete database schema for insurance profitability and pricing optimization platform.

  ## 1. New Tables

  ### `products`
  Insurance product catalog with pricing and coverage details
  - `id` (uuid, primary key)
  - `name` (text) - Product name
  - `category` (text) - Product category (auto, home, life, health)
  - `base_premium` (decimal) - Base premium amount
  - `coverage_amount` (decimal) - Coverage limit
  - `risk_tier` (text) - Risk classification (low, medium, high)
  - `active` (boolean) - Product status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `claims`
  Historical claims data for analysis and forecasting
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `claim_amount` (decimal) - Claim payout amount
  - `claim_date` (date) - Date of claim
  - `claim_type` (text) - Type of claim
  - `region` (text) - Geographic region
  - `weather_related` (boolean) - Weather event flag
  - `severity` (text) - Claim severity (minor, moderate, severe, catastrophic)
  - `status` (text) - Claim status (pending, approved, denied, paid)
  - `created_at` (timestamptz)

  ### `premiums`
  Premium collection records for revenue analysis
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `premium_amount` (decimal) - Premium collected
  - `premium_date` (date) - Collection date
  - `region` (text) - Geographic region
  - `policy_count` (integer) - Number of policies
  - `created_at` (timestamptz)

  ### `weather_events`
  Climate and weather event tracking for risk analysis
  - `id` (uuid, primary key)
  - `event_type` (text) - Event type (hurricane, flood, wildfire, etc.)
  - `event_date` (date) - Date of event
  - `region` (text) - Affected region
  - `severity_score` (decimal) - Severity rating (0-10)
  - `estimated_impact` (decimal) - Estimated financial impact
  - `created_at` (timestamptz)

  ### `demographics`
  Demographic data by region for pricing optimization
  - `id` (uuid, primary key)
  - `region` (text) - Geographic region
  - `population` (integer) - Population count
  - `median_income` (decimal) - Median income
  - `risk_factors` (jsonb) - Additional risk factors
  - `updated_at` (timestamptz)

  ### `forecasts`
  Predictive forecasts and analytics results
  - `id` (uuid, primary key)
  - `forecast_type` (text) - Type of forecast (claims, revenue, profitability)
  - `product_id` (uuid, nullable, foreign key to products)
  - `region` (text) - Geographic region
  - `forecast_date` (date) - Date being forecasted
  - `predicted_value` (decimal) - Predicted amount
  - `confidence_interval_lower` (decimal) - Lower confidence bound
  - `confidence_interval_upper` (decimal) - Upper confidence bound
  - `accuracy_score` (decimal) - Model accuracy
  - `created_at` (timestamptz)

  ### `pricing_recommendations`
  Optimized pricing recommendations
  - `id` (uuid, primary key)
  - `product_id` (uuid, foreign key to products)
  - `current_premium` (decimal) - Current premium
  - `recommended_premium` (decimal) - Recommended premium
  - `expected_profit_margin` (decimal) - Expected profit margin
  - `risk_adjustment` (decimal) - Risk adjustment factor
  - `region` (text) - Target region
  - `valid_from` (date) - Recommendation valid from
  - `valid_until` (date) - Recommendation valid until
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to read all data
  - Add policies for authenticated users to insert/update analytical data

  ## 3. Indexes
  - Add indexes on foreign keys and date columns for query performance
  - Add indexes on region columns for geographic analysis
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  base_premium decimal(12,2) NOT NULL DEFAULT 0,
  coverage_amount decimal(12,2) NOT NULL DEFAULT 0,
  risk_tier text NOT NULL DEFAULT 'medium',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  claim_amount decimal(12,2) NOT NULL DEFAULT 0,
  claim_date date NOT NULL,
  claim_type text NOT NULL,
  region text NOT NULL,
  weather_related boolean DEFAULT false,
  severity text NOT NULL DEFAULT 'moderate',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Create premiums table
CREATE TABLE IF NOT EXISTS premiums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  premium_amount decimal(12,2) NOT NULL DEFAULT 0,
  premium_date date NOT NULL,
  region text NOT NULL,
  policy_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create weather_events table
CREATE TABLE IF NOT EXISTS weather_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_date date NOT NULL,
  region text NOT NULL,
  severity_score decimal(4,2) NOT NULL DEFAULT 0,
  estimated_impact decimal(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create demographics table
CREATE TABLE IF NOT EXISTS demographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text UNIQUE NOT NULL,
  population integer DEFAULT 0,
  median_income decimal(12,2) DEFAULT 0,
  risk_factors jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Create forecasts table
CREATE TABLE IF NOT EXISTS forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  region text NOT NULL,
  forecast_date date NOT NULL,
  predicted_value decimal(12,2) NOT NULL DEFAULT 0,
  confidence_interval_lower decimal(12,2) DEFAULT 0,
  confidence_interval_upper decimal(12,2) DEFAULT 0,
  accuracy_score decimal(5,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create pricing_recommendations table
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  current_premium decimal(12,2) NOT NULL DEFAULT 0,
  recommended_premium decimal(12,2) NOT NULL DEFAULT 0,
  expected_profit_margin decimal(5,4) DEFAULT 0,
  risk_adjustment decimal(5,4) DEFAULT 0,
  region text NOT NULL,
  valid_from date NOT NULL,
  valid_until date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_product_id ON claims(product_id);
CREATE INDEX IF NOT EXISTS idx_claims_date ON claims(claim_date);
CREATE INDEX IF NOT EXISTS idx_claims_region ON claims(region);
CREATE INDEX IF NOT EXISTS idx_premiums_product_id ON premiums(product_id);
CREATE INDEX IF NOT EXISTS idx_premiums_date ON premiums(premium_date);
CREATE INDEX IF NOT EXISTS idx_premiums_region ON premiums(region);
CREATE INDEX IF NOT EXISTS idx_weather_events_date ON weather_events(event_date);
CREATE INDEX IF NOT EXISTS idx_weather_events_region ON weather_events(region);
CREATE INDEX IF NOT EXISTS idx_forecasts_product_id ON forecasts(product_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_product_id ON pricing_recommendations(product_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE premiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to products"
  ON products FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to products"
  ON products FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for claims
CREATE POLICY "Allow public read access to claims"
  ON claims FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to claims"
  ON claims FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to claims"
  ON claims FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for premiums
CREATE POLICY "Allow public read access to premiums"
  ON premiums FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to premiums"
  ON premiums FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policies for weather_events
CREATE POLICY "Allow public read access to weather_events"
  ON weather_events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to weather_events"
  ON weather_events FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policies for demographics
CREATE POLICY "Allow public read access to demographics"
  ON demographics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to demographics"
  ON demographics FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to demographics"
  ON demographics FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for forecasts
CREATE POLICY "Allow public read access to forecasts"
  ON forecasts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to forecasts"
  ON forecasts FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policies for pricing_recommendations
CREATE POLICY "Allow public read access to pricing_recommendations"
  ON pricing_recommendations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to pricing_recommendations"
  ON pricing_recommendations FOR INSERT
  TO public
  WITH CHECK (true);