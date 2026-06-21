const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rbfaziqtvupdcvdvxxye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZmF6aXF0dnVwZGN2ZHZ4eHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MDkzMDMsImV4cCI6MjA5Njk4NTMwM30.AaieHo2dhgDRn4LpRSTaNO2oawir6rcNtgSJpMO5Mfo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users:', JSON.stringify(data, null, 2));
  }
}

run();
