import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for variables, but only log warnings during build if they are missing
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.MODE === 'production' && !import.meta.env.SSR) {
    console.warn('Missing Supabase environment variables');
  } else if (import.meta.env.DEV) {
    throw new Error('Missing Supabase environment variables');
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
