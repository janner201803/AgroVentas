const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const { createClient } = require('@supabase/supabase-js');

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  throw new Error(
    'Faltan variables en backend/.env: NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  );
}

const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// A client per request keeps Supabase RLS scoped to the authenticated user.
supabase.forUser = (accessToken) => createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { Authorization: `Bearer ${accessToken}` }
  }
});

module.exports = supabase;
