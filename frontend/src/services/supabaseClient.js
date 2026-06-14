import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://rbfaziqtvupdcvdvxxye.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZmF6aXF0dnVwZGN2ZHZ4eHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MDkzMDMsImV4cCI6MjA5Njk4NTMwM30.AaieHo2dhgDRn4LpRSTaNO2oawir6rcNtgSJpMO5Mfo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
