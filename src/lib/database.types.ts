export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          base_premium: number;
          coverage_amount: number;
          risk_tier: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      claims: {
        Row: {
          id: string;
          product_id: string | null;
          claim_amount: number;
          claim_date: string;
          claim_type: string;
          region: string;
          weather_related: boolean;
          severity: string;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['claims']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['claims']['Insert']>;
      };
      premiums: {
        Row: {
          id: string;
          product_id: string | null;
          premium_amount: number;
          premium_date: string;
          region: string;
          policy_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['premiums']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['premiums']['Insert']>;
      };
      weather_events: {
        Row: {
          id: string;
          event_type: string;
          event_date: string;
          region: string;
          severity_score: number;
          estimated_impact: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['weather_events']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['weather_events']['Insert']>;
      };
      demographics: {
        Row: {
          id: string;
          region: string;
          population: number;
          median_income: number;
          risk_factors: Record<string, unknown>;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['demographics']['Row'], 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['demographics']['Insert']>;
      };
      forecasts: {
        Row: {
          id: string;
          forecast_type: string;
          product_id: string | null;
          region: string;
          forecast_date: string;
          predicted_value: number;
          confidence_interval_lower: number;
          confidence_interval_upper: number;
          accuracy_score: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['forecasts']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['forecasts']['Insert']>;
      };
      pricing_recommendations: {
        Row: {
          id: string;
          product_id: string | null;
          current_premium: number;
          recommended_premium: number;
          expected_profit_margin: number;
          risk_adjustment: number;
          region: string;
          valid_from: string;
          valid_until: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pricing_recommendations']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['pricing_recommendations']['Insert']>;
      };
    };
  };
}
