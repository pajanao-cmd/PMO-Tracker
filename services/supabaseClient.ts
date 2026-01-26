import { createClient } from '@supabase/supabase-js';

// Use credentials provided in context if env vars are missing
const FALLBACK_URL = 'https://upsfobjlxncpdacjruva.supabase.co';
const FALLBACK_KEY = 'sb_publishable_MxR30wp4RXtPMTdHyULrxw_cs8l3d07';

let supabaseUrl = FALLBACK_URL;
let supabaseKey = FALLBACK_KEY;

// 1. Try Vite Env using direct property access (better for static analysis replacement)
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_SUPABASE_URL) {
      supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  }
} catch (error) {
  // Ignore
}

// 2. Try Process Env (Fallback for other environments)
try {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.VITE_SUPABASE_URL) {
      supabaseUrl = process.env.VITE_SUPABASE_URL;
    }
    if (process.env.VITE_SUPABASE_ANON_KEY) {
      supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    }
  }
} catch (error) {
  // Ignore
}

// 3. Final Validation
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is missing.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);