import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tfysbminznjwjpeyfiiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wyHt15N71PedEoxwd4im2g_IX_ANiLS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
