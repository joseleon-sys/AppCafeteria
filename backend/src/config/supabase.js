import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseServerKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseServerKey) {
    throw new Error('SUPABASE_URL y SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY son obligatorios');
  }

  const supabase = createClient(supabaseUrl, supabaseServerKey);
  console.log('Supabase configurado. Se usara como unico origen de datos.');

  return supabase;
}
